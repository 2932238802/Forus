<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useDislikes } from '~/composables/useDislikes'
import { useIdentity, type IdentityKey } from '~/composables/useIdentity'
import { notifyError } from '~/utils/errors'
import { formatFullDateTime } from '~/utils/time'

definePageMeta({ middleware: 'unlocked' })

const { dislikes, addDislike, updateDislike, removeDislike } = useDislikes()
const { identityKey, identities, nameOf, partnerOf, load: loadIdentity } = useIdentity()

onMounted(() => loadIdentity())

const viewing = ref<IdentityKey>('you')
onMounted(() => {
  const partner = partnerOf(identityKey.value)
  if (partner) viewing.value = partner
})

const isPartnerView = computed(() => {
  const partner = partnerOf(identityKey.value)
  return partner !== null && viewing.value === partner
})

const list = computed(() => dislikes.value.filter((item) => item.owner === viewing.value))
const input = ref('')
const editingId = ref<string | null>(null)
const editText = ref('')

async function submit() {
  if (!isPartnerView.value || !input.value.trim()) return
  try {
    await addDislike(viewing.value, input.value)
    input.value = ''
  } catch (err) {
    notifyError('记录改进点', err)
  }
}

function startEdit(item: { id: string; text: string }) {
  if (!isPartnerView.value) return
  editingId.value = item.id
  editText.value = item.text
}

async function saveEdit(id: string) {
  if (!editText.value.trim()) return
  try {
    await updateDislike(id, editText.value)
    cancelEdit()
  } catch (err) {
    notifyError('保存改进点', err)
  }
}

function cancelEdit() {
  editingId.value = null
  editText.value = ''
}

async function confirmRemove(id: string, text: string) {
  if (!confirm(`确认删除「${text}」？删除表示这个问题已经改正。`)) return
  try {
    await removeDislike(id)
  } catch (err) {
    notifyError('删除改进点', err)
  }
}

function formatDate(timestamp: number) {
  return formatFullDateTime(timestamp)
}
</script>

<template>
  <div>
    <NavBar />
    <div class="mx-auto w-full max-w-3xl p-4 sm:p-6">
      <div class="mb-5 px-1">
        <h1 class="text-lg font-medium tracking-wide text-slate-100">需要改进的地方</h1>
        <p class="mt-1 text-xs leading-relaxed text-slate-500">
          记录对方需要改进的点。对方改正后，就把这条记录删除吧。
        </p>
      </div>

      <div class="mb-4 flex gap-1.5 rounded-xl bg-white/5 p-1 text-sm">
        <button
          v-for="who in identities"
          :key="who.key"
          type="button"
          class="flex-1 rounded-lg py-1.5 transition"
          :class="viewing === who.key ? 'bg-negative text-white' : 'text-slate-400 hover:text-slate-200'"
          @click="viewing = who.key"
        >
          {{ who.name }}
          <span v-if="who.key === partnerOf(identityKey)" class="text-[10px] opacity-70">(可记录)</span>
        </button>
      </div>

      <form v-if="isPartnerView" class="mb-5 flex gap-2" @submit.prevent="submit">
        <input
          v-model="input"
          type="text"
          maxlength="500"
          placeholder="希望 TA 改进什么？"
          class="min-w-0 flex-1 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-slate-100 outline-none transition focus:border-negative"
        >
        <button
          type="submit"
          class="shrink-0 rounded-xl bg-negative px-4 py-2.5 text-sm font-medium text-white transition hover:brightness-110 active:scale-95"
        >
          记录
        </button>
      </form>

      <div class="space-y-3">
        <article
          v-for="item in list"
          :key="item.id"
          class="group rounded-xl border border-negative/15 bg-negative/5 p-4 transition hover:border-negative/30"
        >
          <template v-if="editingId === item.id">
            <textarea
              v-model="editText"
              rows="3"
              maxlength="500"
              class="w-full resize-none rounded-lg border border-negative/40 bg-black/10 px-3 py-2 text-sm leading-relaxed text-slate-100 outline-none focus:border-negative"
              @keydown.esc="cancelEdit"
            />
            <div class="mt-3 flex justify-end gap-2">
              <button type="button" class="rounded-lg px-3 py-1.5 text-xs text-slate-400 hover:bg-white/5" @click="cancelEdit">取消</button>
              <button type="button" class="rounded-lg bg-negative px-3 py-1.5 text-xs font-medium text-white hover:brightness-110" @click="saveEdit(item.id)">保存</button>
            </div>
          </template>

          <template v-else>
            <p class="whitespace-pre-wrap break-words text-sm leading-relaxed text-slate-100">{{ item.text }}</p>
            <div class="mt-3 flex items-center justify-between gap-3">
              <time class="text-[11px] tabular-nums text-slate-500" :datetime="new Date(item.at).toISOString()">
                记录于 {{ formatDate(item.at) }}
              </time>
              <div v-if="isPartnerView" class="flex gap-3 text-slate-600 opacity-0 transition group-hover:opacity-100 focus-within:opacity-100">
                <button type="button" class="text-xs transition hover:text-negative" title="编辑" @click="startEdit(item)">编辑</button>
                <button type="button" class="text-xs transition hover:text-negative" title="已改正，删除记录" @click="confirmRemove(item.id, item.text)">删除</button>
              </div>
            </div>
          </template>
        </article>
      </div>

      <div v-if="!list.length" class="rounded-xl border border-dashed border-white/10 py-12 text-center">
        <p class="text-sm text-slate-400">{{ isPartnerView ? `还没有记录 ${nameOf(viewing)} 需要改进的地方` : `${nameOf(viewing)} 目前没有待改进的记录` }}</p>
        <p class="mt-1 text-xs text-slate-600">愿意记录问题，是为了让彼此变得更好。</p>
      </div>
    </div>
  </div>
</template>
