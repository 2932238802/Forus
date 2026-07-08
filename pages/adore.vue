<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useAdores } from '~/composables/useAdores'
import { useIdentity, type IdentityKey } from '~/composables/useIdentity'

definePageMeta({ middleware: 'unlocked' })

const { adores, addAdore, updateAdore, removeAdore } = useAdores()
const { identityKey, identities, nameOf, partnerOf, load: loadIdentity } = useIdentity()

onMounted(() => loadIdentity())

// 当前查看谁的（默认看「对方」——本页记录的是「我眼中对方的优点」）
const viewing = ref<IdentityKey>('you')
onMounted(() => {
  const ta = partnerOf(identityKey.value)
  if (ta) viewing.value = ta
})

// 是否在看「对方」的（看对方才能增删改——我来夸对方）
const isPartnerView = computed(() => {
  const ta = partnerOf(identityKey.value)
  return ta !== null && viewing.value === ta
})

// 当前查看对象名下的所有「优点 / 很喜欢的地方」
const list = computed(() => adores.value.filter((a) => a.owner === viewing.value))

// ---- 添加 ----
const input = ref('')
async function submit() {
  const t = input.value
  if (!t?.trim() || !isPartnerView.value) return
  await addAdore(viewing.value, t)
  input.value = ''
}

// ---- 行内编辑 ----
const editingId = ref<string | null>(null)
const editText = ref('')
function startEdit(id: string, text: string) {
  if (!isPartnerView.value) return
  editingId.value = id
  editText.value = text
}
async function saveEdit() {
  const id = editingId.value
  if (id && editText.value.trim()) await updateAdore(id, { text: editText.value })
  editingId.value = null
  editText.value = ''
}
function cancelEdit() {
  editingId.value = null
  editText.value = ''
}

function confirmRemove(id: string, name: string) {
  if (confirm(`删除「${name}」？`)) removeAdore(id)
}
</script>

<template>
  <div>
    <NavBar />
    <div class="mx-auto w-full max-w-[900px] p-4 sm:p-6">
      <div class="mb-5 px-1 text-center">
        <h1 class="bg-gradient-to-r from-rose-300 via-pink-300 to-rose-400 bg-clip-text text-2xl font-semibold tracking-wide text-transparent">
          Adore!!
        </h1>
      </div>

      <!-- 切人 -->
      <div class="mb-4 flex gap-1.5 rounded-xl bg-white/5 p-1 text-sm">
        <button
          v-for="who in identities"
          :key="who.key"
          type="button"
          class="flex-1 rounded-lg py-1.5 transition"
          :class="viewing === who.key ? 'bg-rose-500 text-white' : 'text-slate-400 hover:text-slate-200'"
          @click="viewing = who.key"
        >
          {{ who.name }}
          <span v-if="who.key === partnerOf(identityKey)" class="text-[10px] opacity-70">(可记录)</span>
        </button>
      </div>

      <!-- 添加框（只有看对方时可写） -->
      <form v-if="isPartnerView" class="mb-5 flex gap-2" @submit.prevent="submit">
        <input
          v-model="input"
          type="text"
          maxlength="120"
          placeholder="TA 的一个优点 / 让你心动的地方…"
          class="min-w-0 flex-1 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-slate-100 outline-none transition focus:border-rose-400"
        />
        <button
          type="submit"
          class="shrink-0 rounded-xl bg-gradient-to-r from-rose-500 to-pink-500 px-4 py-2.5 text-sm font-medium text-white transition hover:brightness-110 active:scale-95"
        >
          ♥ 记下
        </button>
      </form>

      <!-- 计数 -->
      <p class="mb-3 px-1 text-center text-xs text-slate-500">
        已记下 <span class="font-medium text-rose-300">{{ list.length }}</span> 个喜欢 {{ nameOf(viewing) }} 的理由
      </p>

      <!-- 优点卡片列表 -->
      <div class="grid gap-3 sm:grid-cols-2">
        <div
          v-for="(a, i) in list"
          :key="a.id"
          class="night-card group relative overflow-hidden p-4"
        >
          <div class="pointer-events-none absolute -right-2 -top-3 select-none text-5xl opacity-10 transition group-hover:opacity-20">♥</div>

          <div class="mb-2 flex items-center gap-2">
            <span class="flex h-5 w-5 items-center justify-center rounded-full bg-rose-500/20 text-[10px] font-medium text-rose-300">
              {{ i + 1 }}
            </span>
            <span class="text-[10px] uppercase tracking-widest text-rose-400/60">Adore</span>
          </div>

          <!-- 编辑态 -->
          <template v-if="editingId === a.id">
            <textarea
              v-model="editText"
              rows="2"
              maxlength="120"
              class="w-full resize-none rounded-lg border border-rose-400/40 bg-white/5 px-3 py-2 text-sm text-slate-100 outline-none focus:border-rose-400"
              @keydown.enter.prevent="saveEdit"
              @keydown.esc="cancelEdit"
            />
            <div class="mt-2 flex justify-end gap-2 text-xs">
              <button class="rounded-md px-2.5 py-1 text-slate-400 hover:text-slate-200" @click="cancelEdit">取消</button>
              <button class="rounded-md bg-rose-500/90 px-2.5 py-1 font-medium text-white hover:bg-rose-400" @click="saveEdit">保存</button>
            </div>
          </template>

          <!-- 展示态 -->
          <template v-else>
            <p class="break-words text-sm leading-relaxed text-slate-100">{{ a.text }}</p>
            <div v-if="isPartnerView" class="mt-2 flex justify-end gap-3 text-slate-600 opacity-0 transition group-hover:opacity-100">
              <button class="transition hover:text-rose-300" title="编辑" @click="startEdit(a.id, a.text)">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="h-3.5 w-3.5"><path d="M12 20h9M16.5 3.5a2.12 2.12 0 013 3L7 19l-4 1 1-4z" stroke-linecap="round" stroke-linejoin="round" /></svg>
              </button>
              <button class="transition hover:text-rose-400" title="删除" @click="confirmRemove(a.id, a.text)">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="h-3.5 w-3.5"><path d="M18 6L6 18M6 6l12 12" stroke-linecap="round" /></svg>
              </button>
            </div>
          </template>
        </div>
      </div>

      <!-- 空态 -->
      <div v-if="!list.length" class="night-card mt-2 py-12 text-center">
        <p class="text-sm text-slate-400">
          {{ isPartnerView ? `还没写下 ${nameOf(viewing)} 的优点，从上面开始吧～` : `${nameOf(viewing)} 还没有被记录喜欢的理由` }}
        </p>
      </div>
    </div>
  </div>
</template>
