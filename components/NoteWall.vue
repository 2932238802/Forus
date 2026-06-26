<script setup lang="ts">
import { ref, nextTick, watch, onMounted } from 'vue'
import { siteConfig } from '~/data/site'
import { useNotes } from '~/composables/useNotes'
import { useMedia } from '~/composables/useMedia'
import { useIdentity } from '~/composables/useIdentity'

const { notes, addText, addImage, removeNote } = useNotes()
const { uploadFile } = useMedia()
const { identityKey, nameOf, load: loadIdentity } = useIdentity()

// 当前身份的显示名作为发送者；未选身份时回退到 npy
const author = ref(siteConfig.npy)
onMounted(() => {
  loadIdentity()
  if (identityKey.value) author.value = nameOf(identityKey.value)
})
watch(identityKey, (k) => {
  if (k) author.value = nameOf(k)
})

const text = ref('')
const sending = ref(false)
const listRef = ref<HTMLElement | null>(null)

// 新消息自动滚到底
watch(
  () => notes.value.length,
  async () => {
    await nextTick()
    if (listRef.value) listRef.value.scrollTop = listRef.value.scrollHeight
  },
)

async function sendText() {
  if (!text.value.trim()) return
  await addText(author.value, text.value)
  text.value = ''
}

async function onPickImage(e: Event) {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  sending.value = true
  try {
    const { url } = await uploadFile(file)
    await addImage(author.value, url, text.value.trim())
    text.value = ''
  } catch (err: any) {
    alert('发送失败：' + (err?.message || err))
  } finally {
    sending.value = false
    input.value = ''
  }
}

function isMe(a: string) {
  return a === siteConfig.you
}
function confirmRemove(id: string) {
  if (confirm('删除这条消息？')) removeNote(id)
}
function fmtTime(at: number) {
  const d = new Date(at)
  return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}
</script>

<template>
  <div class="flex h-full flex-col">
    <!-- 消息列表 -->
    <div ref="listRef" class="flex-1 space-y-3 overflow-y-auto pr-1">
      <div
        v-for="n in notes"
        :key="n.id"
        class="group flex flex-col"
        :class="isMe(n.author) ? 'items-end' : 'items-start'"
      >
        <span class="mb-0.5 px-1 text-[10px] tracking-wide text-slate-500">
          {{ n.author }} · {{ fmtTime(n.at) }}
        </span>
        <div class="flex items-center gap-1.5" :class="isMe(n.author) ? 'flex-row-reverse' : ''">
          <!-- 气泡 -->
          <div
            class="max-w-[78%] overflow-hidden rounded-2xl text-sm"
            :class="isMe(n.author)
              ? 'rounded-tr-sm bg-sky-500/90 text-white'
              : 'rounded-tl-sm bg-white/10 text-slate-100'"
          >
            <template v-if="n.kind === 'image'">
              <img :src="n.imageUrl" class="max-h-52 w-full object-cover" />
              <p v-if="n.text" class="px-3 py-1.5">{{ n.text }}</p>
            </template>
            <p v-else class="whitespace-pre-wrap break-words px-3 py-2 leading-relaxed">{{ n.text }}</p>
          </div>
          <!-- 删除 -->
          <button
            class="shrink-0 text-slate-600 opacity-0 transition hover:text-rose-400 group-hover:opacity-100"
            @click="confirmRemove(n.id)"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="h-3.5 w-3.5">
              <path d="M18 6L6 18M6 6l12 12" stroke-linecap="round" />
            </svg>
          </button>
        </div>
      </div>
      <p v-if="!notes.length" class="pt-8 text-center text-xs text-slate-600">
        还没有消息，开始聊天吧～
      </p>
    </div>

    <!-- 输入区 -->
    <div class="mt-3 shrink-0 space-y-2">
      <div class="flex items-center gap-1.5 px-1 text-[11px] text-slate-500">
        <span class="inline-block h-1.5 w-1.5 rounded-full bg-sky-400"></span>
        以 <span class="text-slate-300">{{ author }}</span> 的身份发送
      </div>
      <form class="flex items-center gap-2" @submit.prevent="sendText">
        <!-- 发图 -->
        <label
          class="flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-lg bg-white/5 text-slate-300 transition hover:bg-white/10"
          title="发送图片"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" class="h-5 w-5">
            <rect x="3" y="3" width="18" height="18" rx="2" />
            <circle cx="8.5" cy="8.5" r="1.5" />
            <path d="M21 15l-5-5L5 21" stroke-linecap="round" stroke-linejoin="round" />
          </svg>
          <input type="file" accept="image/*" class="hidden" @change="onPickImage" />
        </label>
        <input
          v-model="text"
          type="text"
          maxlength="500"
          :placeholder="sending ? '发送中…' : '说点什么…'"
          :disabled="sending"
          class="min-w-0 flex-1 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-100 outline-none focus:border-sky-400"
        />
        <button
          type="submit"
          :disabled="sending"
          class="shrink-0 rounded-lg bg-sky-500 px-3 py-2 text-sm font-medium text-white transition hover:bg-sky-400 active:scale-95 disabled:opacity-50"
        >
          发送
        </button>
      </form>
    </div>
  </div>
</template>
