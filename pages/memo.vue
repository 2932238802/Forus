<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useMemo } from '~/composables/useMemo'
import { useMemoComments } from '~/composables/useMemoComments'
import { useIdentity, type IdentityKey } from '~/composables/useIdentity'

definePageMeta({ middleware: 'unlocked' })

const { memos, addMemo, toggleMemo, updateMemoText, removeMemo } = useMemo()
const { byMemo, addComment, removeComment } = useMemoComments()
const { identityKey, identities, nameOf, load: loadIdentity } = useIdentity()

onMounted(() => loadIdentity())

// 当前查看的是谁的备忘录（默认看自己，没身份则看在野）
const viewing = ref<IdentityKey>('npy')
onMounted(() => {
  if (identityKey.value) viewing.value = identityKey.value
})

// 是否在看自己的（看自己才能增删备忘录条目）
const isOwnView = computed(() => identityKey.value === viewing.value)

// 当前 Tab 下的备忘录
const list = computed(() => memos.value.filter((m) => m.owner === viewing.value))

const text = ref('')
function submitMemo() {
  if (!text.value.trim() || !identityKey.value) return
  // 只能往自己名下加
  addMemo(identityKey.value, text.value)
  text.value = ''
}

function confirmRemove(id: string, name: string) {
  if (confirm(`删除备忘「${name}」？`)) removeMemo(id)
}

// ---- 编辑备忘录内容 ----
const editingId = ref<string | null>(null)
const editText = ref('')

function startEdit(id: string, current: string) {
  editingId.value = id
  editText.value = current
}
function cancelEdit() {
  editingId.value = null
  editText.value = ''
}
async function saveEdit(id: string) {
  if (!editText.value.trim()) return
  await updateMemoText(id, editText.value)
  editingId.value = null
  editText.value = ''
}

// ---- 评论 ----
const openComments = ref<Record<string, boolean>>({}) // memoId -> 是否展开
const commentInput = ref<Record<string, string>>({}) // memoId -> 输入内容

function toggleComments(id: string) {
  openComments.value[id] = !openComments.value[id]
}

async function submitComment(memoId: string) {
  const t = commentInput.value[memoId]
  if (!t?.trim() || !identityKey.value) return
  await addComment(memoId, identityKey.value, t)
  commentInput.value[memoId] = ''
}

function confirmRemoveComment(id: string) {
  if (confirm('删除这条评论？')) removeComment(id)
}

function fmt(at: number) {
  const d = new Date(at)
  return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}
</script>

<template>
  <div>
    <NavBar />
    <div class="mx-auto w-full max-w-2xl p-4 sm:p-6">
      <div class="night-card p-6">
        <h1 class="text-lg font-medium tracking-wide text-slate-100">备忘录</h1>
        <p class="mt-1 text-xs text-slate-500">
          {{ isOwnView ? '随手记下要做的事' : `看看 ${nameOf(viewing)} 写了什么，留个言吧` }}
        </p>

        <!-- 切换看谁的 -->
        <div class="mt-4 flex gap-1.5 rounded-xl bg-white/5 p-1 text-sm">
          <button
            v-for="who in identities"
            :key="who.key"
            type="button"
            class="flex-1 rounded-lg py-1.5 transition"
            :class="viewing === who.key ? 'bg-sky-500 text-white' : 'text-slate-400 hover:text-slate-200'"
            @click="viewing = who.key"
          >
            {{ who.name }}的
            <span v-if="who.key === identityKey" class="text-[10px] opacity-70">(我)</span>
          </button>
        </div>

        <!-- 输入：只在看自己的时候显示 -->
        <form v-if="isOwnView" class="mt-4 flex gap-2" @submit.prevent="submitMemo">
          <input
            v-model="text"
            type="text"
            maxlength="200"
            placeholder="记一条…"
            class="min-w-0 flex-1 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-100 outline-none focus:border-sky-400"
          />
          <button
            type="submit"
            class="shrink-0 rounded-lg bg-sky-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-sky-400 active:scale-95"
          >
            添加
          </button>
        </form>

        <!-- 列表 -->
        <ul class="mt-5 space-y-2.5">
          <li
            v-for="m in list"
            :key="m.id"
            class="group rounded-xl border border-white/10 bg-white/5 px-3 py-2.5"
          >
            <div class="flex items-center gap-3">
              <input
                type="checkbox"
                :checked="m.done"
                :disabled="!isOwnView || editingId === m.id"
                class="h-4 w-4 shrink-0 accent-sky-500 disabled:opacity-50"
                @change="toggleMemo(m.id, !m.done)"
              />

              <!-- 编辑态：输入框 -->
              <template v-if="editingId === m.id">
                <input
                  v-model="editText"
                  type="text"
                  maxlength="200"
                  class="min-w-0 flex-1 rounded-lg border border-sky-400/50 bg-white/5 px-2.5 py-1.5 text-sm text-slate-100 outline-none focus:border-sky-400"
                  @keyup.enter="saveEdit(m.id)"
                  @keyup.esc="cancelEdit"
                />
                <button class="shrink-0 rounded-lg bg-sky-500 px-2.5 py-1.5 text-xs font-medium text-white transition hover:bg-sky-400 active:scale-95" @click="saveEdit(m.id)">保存</button>
                <button class="shrink-0 rounded-lg px-2 py-1.5 text-xs text-slate-400 hover:bg-white/5" @click="cancelEdit">取消</button>
              </template>

              <!-- 普通态：文字 + 操作 -->
              <template v-else>
                <span class="flex-1 whitespace-pre-wrap break-words text-sm leading-relaxed" :class="m.done ? 'text-slate-500 line-through' : 'text-slate-200'">
                  {{ m.text }}
                </span>
                <!-- 编辑：只有自己的能改 -->
                <button
                  v-if="isOwnView"
                  class="shrink-0 text-slate-600 opacity-0 transition hover:text-sky-300 group-hover:opacity-100"
                  title="编辑"
                  @click="startEdit(m.id, m.text)"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="h-3.5 w-3.5">
                    <path d="M12 20h9M16.5 3.5a2.12 2.12 0 013 3L7 19l-4 1 1-4 12.5-12.5z" stroke-linecap="round" stroke-linejoin="round" />
                  </svg>
                </button>
                <!-- 评论数 / 展开 -->
                <button
                  class="flex shrink-0 items-center gap-1 text-[11px] text-slate-500 transition hover:text-sky-300"
                  title="评论"
                  @click="toggleComments(m.id)"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="h-3.5 w-3.5">
                    <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" stroke-linecap="round" stroke-linejoin="round" />
                  </svg>
                  <span v-if="byMemo(m.id).length">{{ byMemo(m.id).length }}</span>
                </button>
                <!-- 删除：只有自己的能删 -->
                <button
                  v-if="isOwnView"
                  class="shrink-0 text-slate-600 opacity-0 transition hover:text-rose-400 group-hover:opacity-100"
                  @click="confirmRemove(m.id, m.text)"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="h-4 w-4">
                    <path d="M18 6L6 18M6 6l12 12" stroke-linecap="round" />
                  </svg>
                </button>
              </template>
            </div>

            <!-- 评论区 -->
            <div v-if="openComments[m.id]" class="mt-3 border-t border-white/10 pt-3">
              <ul class="space-y-2">
                <li v-for="c in byMemo(m.id)" :key="c.id" class="group/c flex items-start gap-2">
                  <span
                    class="mt-0.5 shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-medium"
                    :class="c.author === 'you' ? 'bg-sky-500/20 text-sky-300' : 'bg-rose-500/20 text-rose-300'"
                  >
                    {{ nameOf(c.author) }}
                  </span>
                  <span class="flex-1 whitespace-pre-wrap break-words text-xs leading-relaxed text-slate-300">{{ c.text }}</span>
                  <span class="shrink-0 text-[10px] tabular-nums text-slate-600">{{ fmt(c.at) }}</span>
                  <button
                    v-if="c.author === identityKey"
                    class="shrink-0 text-slate-600 opacity-0 transition hover:text-rose-400 group-hover/c:opacity-100"
                    @click="confirmRemoveComment(c.id)"
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="h-3 w-3"><path d="M18 6L6 18M6 6l12 12" stroke-linecap="round" /></svg>
                  </button>
                </li>
                <li v-if="!byMemo(m.id).length" class="text-[11px] text-slate-600">还没有评论，来留第一条～</li>
              </ul>

              <!-- 发评论 -->
              <form class="mt-2.5 flex gap-1.5" @submit.prevent="submitComment(m.id)">
                <input
                  v-model="commentInput[m.id]"
                  type="text"
                  maxlength="200"
                  :placeholder="`以 ${nameOf(identityKey)} 的身份评论…`"
                  class="min-w-0 flex-1 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 text-xs text-slate-100 outline-none focus:border-sky-400"
                />
                <button type="submit" class="shrink-0 rounded-lg bg-sky-500/90 px-2.5 py-1.5 text-xs font-medium text-white transition hover:bg-sky-400 active:scale-95">
                  发送
                </button>
              </form>
            </div>
          </li>
        </ul>
        <p v-if="!list.length" class="mt-8 text-center text-xs text-slate-600">
          {{ isOwnView ? '还没有备忘，记一条吧' : `${nameOf(viewing)} 还没有备忘` }}
        </p>
      </div>
    </div>
  </div>
</template>
