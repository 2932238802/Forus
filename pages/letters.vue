<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useLetters, isUnlocked, daysToUnlock } from '~/composables/useLetters'
import { useIdentity, type IdentityKey } from '~/composables/useIdentity'

definePageMeta({ middleware: 'unlocked' })

const { letters, sendLetter, removeLetter } = useLetters()
const { identityKey, partnerOf, nameOf, load: loadIdentity } = useIdentity()

onMounted(() => loadIdentity())

const me = computed<IdentityKey | null>(() => identityKey.value)
const ta = computed<IdentityKey | null>(() => partnerOf(identityKey.value))

// 今天，用于日期选择最小值（至少明天才有意义，但允许今天）
const todayStr = computed(() => {
  const d = new Date()
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
})

// 写信表单
const showEditor = ref(false)
const form = ref({ title: '', content: '', unlockDate: '' })
const saving = ref(false)

function openEditor() {
  form.value = { title: '', content: '', unlockDate: '' }
  showEditor.value = true
}

async function save() {
  if (!me.value || !ta.value) return
  if (!form.value.content.trim()) {
    alert('信的内容还没写呢～')
    return
  }
  if (!form.value.unlockDate) {
    alert('选一个开启的日子吧')
    return
  }
  saving.value = true
  try {
    await sendLetter(me.value, ta.value, form.value.title, form.value.content, form.value.unlockDate)
    showEditor.value = false
  } catch (err: any) {
    alert('寄出失败：' + (err?.message || err))
  } finally {
    saving.value = false
  }
}

// 我写给 TA 的 / TA 写给我的
const sentByMe = computed(() => letters.value.filter((l) => l.whoFrom === me.value))
const sentToMe = computed(() => letters.value.filter((l) => l.whoTo === me.value))

// 是否能读这封信的内容：
//  - 写信人始终能回看自己写的
//  - 收信人需到解锁日期之后
function canRead(l: { whoFrom: IdentityKey; whoTo: IdentityKey; unlockDate: string }): boolean {
  if (l.whoFrom === me.value) return true
  if (l.whoTo === me.value) return isUnlocked(l.unlockDate)
  return false
}

// 展开阅读的信 id
const openId = ref<string | null>(null)
function tryOpen(l: any) {
  if (!canRead(l)) return
  openId.value = openId.value === l.id ? null : l.id
}

function confirmRemove(id: string) {
  if (confirm('删除这封信？')) {
    removeLetter(id)
    if (openId.value === id) openId.value = null
  }
}

function fmtDate(s: string) {
  return s.replaceAll('-', '.')
}
</script>

<template>
  <div>
    <NavBar />
    <div class="mx-auto w-full max-w-2xl p-4 sm:p-6">
      <div class="night-card p-6">
        <div class="flex items-start justify-between">
          <div>
            <h1 class="text-lg font-medium tracking-wide text-slate-100">给未来的信</h1>
            <p class="mt-1 text-xs text-slate-500">
              写给 {{ nameOf(ta) || 'TA' }}，到了那天才能拆开 💌
            </p>
          </div>
          <button
            class="shrink-0 rounded-full bg-sky-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-sky-400 active:scale-95"
            @click="openEditor"
          >
            写一封
          </button>
        </div>

        <!-- TA 写给我的 -->
        <section class="mt-6">
          <h2 class="mb-2.5 text-xs font-medium tracking-wide text-rose-300">
            💗 {{ nameOf(ta) || 'TA' }} 写给我的
          </h2>
          <ul class="space-y-2.5">
            <li
              v-for="l in sentToMe"
              :key="l.id"
              class="overflow-hidden rounded-xl border border-white/10 bg-white/5"
            >
              <button
                class="flex w-full items-center gap-3 px-4 py-3 text-left transition"
                :class="canRead(l) ? 'hover:bg-white/5' : 'cursor-default'"
                @click="tryOpen(l)"
              >
                <span class="text-2xl">{{ canRead(l) ? '💌' : '🔒' }}</span>
                <div class="min-w-0 flex-1">
                  <p class="truncate text-sm font-medium text-slate-200">
                    {{ l.title || '(无标题)' }}
                  </p>
                  <p class="text-[11px] text-slate-500">
                    <template v-if="canRead(l)">已可开启 · {{ fmtDate(l.unlockDate) }}</template>
                    <template v-else>将在 {{ fmtDate(l.unlockDate) }} 开启 · 还有 {{ daysToUnlock(l.unlockDate) }} 天</template>
                  </p>
                </div>
              </button>
              <!-- 信的内容 -->
              <div v-if="openId === l.id && canRead(l)" class="border-t border-white/10 px-4 py-3">
                <p class="whitespace-pre-wrap break-words text-sm leading-relaxed text-slate-200">{{ l.content }}</p>
              </div>
            </li>
            <li v-if="!sentToMe.length" class="rounded-xl border border-dashed border-white/10 py-6 text-center text-xs text-slate-600">
              还没有收到信
            </li>
          </ul>
        </section>

        <!-- 我写给 TA 的 -->
        <section class="mt-7">
          <h2 class="mb-2.5 text-xs font-medium tracking-wide text-sky-300">
            ✍️ 我写给 {{ nameOf(ta) || 'TA' }} 的
          </h2>
          <ul class="space-y-2.5">
            <li
              v-for="l in sentByMe"
              :key="l.id"
              class="group overflow-hidden rounded-xl border border-white/10 bg-white/5"
            >
              <div class="flex items-center gap-3 px-4 py-3">
                <span class="text-2xl">{{ isUnlocked(l.unlockDate) ? '💌' : '🔒' }}</span>
                <button class="min-w-0 flex-1 text-left" @click="tryOpen(l)">
                  <p class="truncate text-sm font-medium text-slate-200">{{ l.title || '(无标题)' }}</p>
                  <p class="text-[11px] text-slate-500">
                    <template v-if="isUnlocked(l.unlockDate)">{{ nameOf(ta) }} 已可开启 · {{ fmtDate(l.unlockDate) }}</template>
                    <template v-else>{{ nameOf(ta) }} 将在 {{ fmtDate(l.unlockDate) }} 开启 · 还有 {{ daysToUnlock(l.unlockDate) }} 天</template>
                  </p>
                </button>
                <button
                  class="shrink-0 text-slate-600 opacity-0 transition hover:text-rose-400 group-hover:opacity-100"
                  @click="confirmRemove(l.id)"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="h-4 w-4"><path d="M18 6L6 18M6 6l12 12" stroke-linecap="round" /></svg>
                </button>
              </div>
              <div v-if="openId === l.id" class="border-t border-white/10 px-4 py-3">
                <p class="whitespace-pre-wrap break-words text-sm leading-relaxed text-slate-300">{{ l.content }}</p>
              </div>
            </li>
            <li v-if="!sentByMe.length" class="rounded-xl border border-dashed border-white/10 py-6 text-center text-xs text-slate-600">
              还没有写过信
            </li>
          </ul>
        </section>
      </div>
    </div>

    <!-- 写信弹窗 -->
    <Teleport to="body">
      <div v-if="showEditor" class="fixed inset-0 z-[200] flex items-center justify-center p-4">
        <div class="absolute inset-0 bg-black/60 backdrop-blur-sm" @click="showEditor = false" />
        <div class="relative w-full max-w-md rounded-2xl border border-white/10 bg-slate-900 p-6 shadow-2xl">
          <h3 class="text-base font-semibold text-slate-100">写给 {{ nameOf(ta) || 'TA' }} 的信</h3>

          <input
            v-model="form.title"
            type="text"
            maxlength="40"
            placeholder="标题（可留空）"
            class="mt-4 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-100 outline-none focus:border-sky-400"
          />
          <textarea
            v-model="form.content"
            rows="6"
            maxlength="2000"
            placeholder="想对 TA 说的话…"
            class="mt-3 w-full resize-none rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm leading-relaxed text-slate-100 outline-none focus:border-sky-400"
          />

          <label class="mt-3 block text-xs text-slate-400">什么时候可以拆开？</label>
          <input
            v-model="form.unlockDate"
            type="date"
            :min="todayStr"
            class="mt-1.5 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-300 outline-none focus:border-sky-400"
          />

          <div class="mt-5 flex justify-end gap-2">
            <button class="rounded-full px-4 py-2 text-sm text-slate-400 hover:bg-white/5" @click="showEditor = false">取消</button>
            <button
              :disabled="saving"
              class="rounded-full bg-sky-500 px-5 py-2 text-sm font-medium text-white hover:bg-sky-400 active:scale-95 disabled:opacity-50"
              @click="save"
            >
              {{ saving ? '寄出中…' : '寄出' }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>
