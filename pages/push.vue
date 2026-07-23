<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { usePushbacks } from '~/composables/usePushbacks'
import { useIdentity } from '~/composables/useIdentity'

definePageMeta({ middleware: 'unlocked' })

const { pushbacks, addPushback, updatePushback, removePushback } = usePushbacks()
const { identityKey, load: loadIdentity } = useIdentity()

onMounted(() => loadIdentity())

const total = computed(() => pushbacks.value.length)

const textInput = ref('')
const noteInput = ref('')

async function submit() {
  if (!textInput.value.trim() || !identityKey.value) return
  await addPushback(identityKey.value, textInput.value, noteInput.value)
  textInput.value = ''
  noteInput.value = ''
}

const editingId = ref<string | null>(null)
const editText = ref('')
const editNote = ref('')

function startEdit(p: { id: string; text: string; note: string }) {
  editingId.value = p.id
  editText.value = p.text
  editNote.value = p.note
}

function cancelEdit() {
  editingId.value = null
  editText.value = ''
  editNote.value = ''
}

async function saveEdit() {
  const id = editingId.value
  if (!id || !editText.value.trim()) return
  await updatePushback(id, { text: editText.value, note: editNote.value })
  editingId.value = null
  editText.value = ''
  editNote.value = ''
}

function confirmRemove(id: string, text: string) {
  if (confirm(`删除「${text}」？`)) removePushback(id)
}

function fmt(at: number) {
  const d = new Date(at)
  const now = Date.now()
  const diff = now - at
  const mins = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)
  if (mins < 1) return '刚刚'
  if (mins < 60) return `${mins} 分钟前`
  if (hours < 24) return `${hours} 小时前`
  if (days === 1) return '昨天'
  if (days < 7) return `${days} 天前`
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
</script>

<template>
  <div>
    <NavBar />
    <div class="mx-auto w-full max-w-2xl p-4 sm:p-6">
      <div class="night-card overflow-hidden p-5 sm:p-6">
        <div class="mb-1 flex items-center justify-between">
          <div>
            <h1 class="page-title">又推又推</h1>
            <p class="mt-1 text-xs text-slate-500">她说反话推开你的时候，记在这里</p>
          </div>
          <div v-if="total" class="flex items-center gap-1 text-xs text-slate-500">
            <span class="rounded-full bg-white/10 px-2.5 py-1 tabular-nums">{{ total }}</span>
          </div>
        </div>

        <form class="mt-5 flex flex-col gap-2" @submit.prevent="submit">
          <input
            v-model="textInput"
            type="text"
            maxlength="500"
            placeholder="她说了什么…"
            class="surface-input w-full rounded-xl px-4 py-2.5 text-sm outline-none"
          />
          <div class="flex gap-2">
            <input
              v-model="noteInput"
              type="text"
              maxlength="500"
              placeholder="备注（可选：你的感受 / 背景）"
              class="surface-input min-w-0 flex-1 rounded-xl px-4 py-2.5 text-sm outline-none"
            />
            <button
              type="submit"
              class="surface-button shrink-0 rounded-xl px-4 py-2.5 text-sm font-medium"
            >
              记下
            </button>
          </div>
        </form>

        <div v-if="pushbacks.length" class="mt-6 space-y-3">
          <div
            v-for="p in pushbacks"
            :key="p.id"
            class="group relative rounded-xl border border-white/10 bg-white/5 px-4 py-3 transition hover:border-rose-400/20"
          >
            <template v-if="editingId === p.id">
              <input
                v-model="editText"
                type="text"
                maxlength="500"
                class="w-full rounded-lg border border-rose-400/40 bg-white/5 px-3 py-2 text-sm text-slate-100 outline-none"
              />
              <input
                v-model="editNote"
                type="text"
                maxlength="500"
                placeholder="备注"
                class="mt-2 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-300 outline-none"
              />
              <div class="mt-2 flex justify-end gap-2 text-xs">
                <button class="rounded-md px-2.5 py-1 text-slate-400 hover:text-slate-200" @click="cancelEdit">取消</button>
                <button class="rounded-md bg-rose-500/90 px-2.5 py-1 font-medium text-white hover:bg-rose-400" @click="saveEdit">保存</button>
              </div>
            </template>

            <template v-else>
              <div class="mb-2 flex items-center justify-between">
                <span class="text-xs tabular-nums text-rose-400/70">{{ fmt(p.at) }}</span>
              </div>
              <p class="break-words text-sm leading-relaxed text-slate-100">
                <span class="mr-1.5 text-rose-400/60">「</span>{{ p.text }}<span class="ml-1.5 text-rose-400/60">」</span>
              </p>
              <p v-if="p.note" class="mt-1.5 break-words text-xs leading-relaxed text-slate-500">
                {{ p.note }}
              </p>
              <div class="mt-2 flex justify-end gap-3 text-slate-600 opacity-0 transition group-hover:opacity-100">
                  <button class="transition hover:text-rose-300" title="编辑" @click="startEdit(p)">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="h-3.5 w-3.5"><path d="M12 20h9M16.5 3.5a2.12 2.12 0 013 3L7 19l-4 1 1-4z" stroke-linecap="round" stroke-linejoin="round" /></svg>
                  </button>
                  <button class="transition hover:text-rose-400" title="删除" @click="confirmRemove(p.id, p.text)">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="h-3.5 w-3.5"><path d="M18 6L6 18M6 6l12 12" stroke-linecap="round" /></svg>
                  </button>
                </div>
              </template>
          </div>
        </div>

        <div v-else class="mt-12 py-12 text-center">
          <p class="text-sm text-slate-500">还没有记录，希望不会有太多条</p>
        </div>
      </div>
    </div>
  </div>
</template>
