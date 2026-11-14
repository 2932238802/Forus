<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useLikes, CATEGORIES, type LikeKind, type LikeCategory } from '~/composables/useLikes'
import { useIdentity, type IdentityKey } from '~/composables/useIdentity'
import { notifyError } from '~/utils/errors'

definePageMeta({ middleware: 'unlocked' })

const { likes, addLike, updateLike, removeLike } = useLikes()
const { identityKey, identities, partnerOf, load: loadIdentity } = useIdentity()

onMounted(() => loadIdentity())

// 当前查看谁的（默认看「对方」——本页记录的是「我眼中对方的喜好」）
const viewing = ref<IdentityKey>('you')
onMounted(() => {
  const ta = partnerOf(identityKey.value)
  if (ta) viewing.value = ta
})
// 是否在看「对方」的（看对方才能增删——我来维护对方的喜好档案）
const isPartnerView = computed(() => {
  const ta = partnerOf(identityKey.value)
  return ta !== null && viewing.value === ta
})

// 当前分类
const cat = ref<LikeCategory>('food')

// 当前筛选下的条目
function items(kind: LikeKind) {
  return likes.value.filter(
    (l) => l.owner === viewing.value && l.kind === kind && l.category === cat.value,
  )
}

// 各分类在当前人下的条目数（给 Tab 显示小计数）
function countOf(category: LikeCategory) {
  return likes.value.filter((l) => l.owner === viewing.value && l.category === category).length
}

// ---- 添加（只能加到对方名下，进当前分类）----
const inputs = ref<Record<LikeKind, string>>({ like: '', dislike: '' })
async function submit(kind: LikeKind) {
  const t = inputs.value[kind]
  if (!t?.trim() || !isPartnerView.value) return
  try {
    // 加到「对方」名下（viewing 即对方）
    await addLike(viewing.value, kind, cat.value, t)
    inputs.value[kind] = ''
  } catch (err) {
    notifyError('添加喜好', err)
  }
}

async function confirmRemove(id: string, name: string) {
  if (!confirm(`删除「${name}」？`)) return
  try {
    await removeLike(id)
  } catch (err) {
    notifyError('删除喜好', err)
  }
}

// ---- 拖拽（桌面）：把卡片拖到另一栏 → 改 kind ----
const dragId = ref<string | null>(null)
const dragOver = ref<LikeKind | null>(null)

function onDragStart(id: string) {
  dragId.value = id
}
async function onDrop(kind: LikeKind) {
  dragOver.value = null
  const id = dragId.value
  dragId.value = null
  if (!id || !isPartnerView.value) return
  const item = likes.value.find((l) => l.id === id)
  if (item && item.kind !== kind) {
    try {
      await updateLike(id, { kind })
    } catch (err) {
      notifyError('移动喜好', err)
    }
  }
}

// ---- 手机：点按钮把条目挪到另一栏 ----
async function flip(id: string, current: LikeKind) {
  if (!isPartnerView.value) return
  try {
    await updateLike(id, { kind: current === 'like' ? 'dislike' : 'like' })
  } catch (err) {
    notifyError('移动喜好', err)
  }
}
</script>

<template>
  <div>
    <NavBar />
    <div class="mx-auto w-full max-w-[1600px] p-4 sm:p-6">
      <div class="mb-4 flex items-center justify-between px-1">
        <h1 class="page-title">Like And Unlike</h1>
        <span class="text-lg opacity-75">☯</span>
      </div>

      <!-- 切人 -->
      <div class="mb-3 flex gap-1.5 rounded-xl bg-white/5 p-1 text-sm">
        <button
          v-for="who in identities"
          :key="who.key"
          type="button"
          class="flex-1 rounded-lg py-1.5 transition"
          :class="viewing === who.key ? 'surface-button text-white' : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'"
          @click="viewing = who.key"
        >
          {{ who.name }}
          <span v-if="who.key === partnerOf(identityKey)" class="text-[10px] opacity-70">(可记录)</span>
        </button>
      </div>

      <!-- 切分类 -->
      <div class="mb-4 flex flex-wrap gap-1.5">
        <button
          v-for="c in CATEGORIES"
          :key="c.key"
          type="button"
          class="flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs transition"
          :class="cat === c.key
            ? 'border-accent/60 bg-accent/15 text-accent'
            : 'border-white/10 bg-white/5 text-slate-400 hover:text-slate-200'"
          @click="cat = c.key"
        >
          <span>{{ c.emoji }}</span>
          <span>{{ c.label }}</span>
          <span v-if="countOf(c.key)" class="rounded-full bg-white/10 px-1.5 text-[10px]">{{ countOf(c.key) }}</span>
        </button>
      </div>

      <!-- 喜欢 / 不喜欢 双栏 -->
      <div class="grid gap-4 md:grid-cols-2">
        <!-- 喜欢 -->
        <div
          class="night-card p-4 transition"
          :class="dragOver === 'like' ? 'ring-2 ring-positive/60' : ''"
          @dragover.prevent="dragOver = 'like'"
          @dragleave="dragOver = null"
          @drop="onDrop('like')"
        >
          <p class="mb-3 flex items-center gap-1.5 text-xs font-medium text-positive">
            <span>♥</span> 喜欢
          </p>
          <form v-if="isPartnerView" class="mb-3 flex gap-2" @submit.prevent="submit('like')">
            <input
              v-model="inputs.like"
              type="text"
              maxlength="80"
              placeholder="喜欢的东西…"
              class="min-w-0 flex-1 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-100 outline-none focus:border-positive"
            >
            <button type="submit" class="shrink-0 rounded-lg bg-positive/90 px-3 py-2 text-sm font-medium text-white transition hover:brightness-110 active:scale-95">加</button>
          </form>
          <ul class="space-y-1.5">
            <li
              v-for="l in items('like')"
              :key="l.id"
              :draggable="isPartnerView"
              class="group flex cursor-grab items-center gap-2 rounded-lg border border-positive/15 bg-positive/5 px-3 py-2 active:cursor-grabbing"
              @dragstart="onDragStart(l.id)"
            >
              <span class="flex-1 break-words text-sm text-slate-200">{{ l.text }}</span>
              <!-- 手机/快捷：移到不喜欢 -->
              <button v-if="isPartnerView" class="shrink-0 text-slate-600 transition hover:text-negative" title="移到不喜欢" @click="flip(l.id, 'like')">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="h-3.5 w-3.5"><path d="M5 12h14M13 6l6 6-6 6" stroke-linecap="round" stroke-linejoin="round" /></svg>
              </button>
              <button v-if="isPartnerView" class="shrink-0 text-slate-600 opacity-0 transition hover:text-negative group-hover:opacity-100" @click="confirmRemove(l.id, l.text)">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="h-3.5 w-3.5"><path d="M18 6L6 18M6 6l12 12" stroke-linecap="round" /></svg>
              </button>
            </li>
            <li v-if="!items('like').length" class="py-4 text-center text-xs text-slate-600">还没有</li>
          </ul>
        </div>

        <!-- 不喜欢 -->
        <div
          class="night-card p-4 transition"
          :class="dragOver === 'dislike' ? 'ring-2 ring-negative/60' : ''"
          @dragover.prevent="dragOver = 'dislike'"
          @dragleave="dragOver = null"
          @drop="onDrop('dislike')"
        >
          <p class="mb-3 flex items-center gap-1.5 text-xs font-medium text-negative">
            <span>✕</span> 不喜欢
          </p>
          <form v-if="isPartnerView" class="mb-3 flex gap-2" @submit.prevent="submit('dislike')">
            <input
              v-model="inputs.dislike"
              type="text"
              maxlength="80"
              placeholder="不喜欢的东西…"
              class="min-w-0 flex-1 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-100 outline-none focus:border-negative"
            >
            <button type="submit" class="shrink-0 rounded-lg bg-negative/90 px-3 py-2 text-sm font-medium text-white transition hover:brightness-110 active:scale-95">加</button>
          </form>
          <ul class="space-y-1.5">
            <li
              v-for="l in items('dislike')"
              :key="l.id"
              :draggable="isPartnerView"
              class="group flex cursor-grab items-center gap-2 rounded-lg border border-negative/15 bg-negative/5 px-3 py-2 active:cursor-grabbing"
              @dragstart="onDragStart(l.id)"
            >
              <!-- 手机/快捷：移到喜欢 -->
              <button v-if="isPartnerView" class="shrink-0 text-slate-600 transition hover:text-positive" title="移到喜欢" @click="flip(l.id, 'dislike')">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="h-3.5 w-3.5"><path d="M19 12H5M11 6l-6 6 6 6" stroke-linecap="round" stroke-linejoin="round" /></svg>
              </button>
              <span class="flex-1 break-words text-sm text-slate-200">{{ l.text }}</span>
              <button v-if="isPartnerView" class="shrink-0 text-slate-600 opacity-0 transition hover:text-negative group-hover:opacity-100" @click="confirmRemove(l.id, l.text)">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="h-3.5 w-3.5"><path d="M18 6L6 18M6 6l12 12" stroke-linecap="round" /></svg>
              </button>
            </li>
            <li v-if="!items('dislike').length" class="py-4 text-center text-xs text-slate-600">还没有</li>
          </ul>
        </div>
      </div>
    </div>
  </div>
</template>
