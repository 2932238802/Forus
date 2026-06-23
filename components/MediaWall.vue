<script setup lang="ts">
import { ref, reactive } from 'vue'
import type { MediaItem } from '~/types'
import { useMedia } from '~/composables/useMedia'

const { media, addItem, updateItem, removeItem, uploadFile } = useMedia()

const showEditor = ref(false)
const editingId = ref<string | null>(null)
const saving = ref(false)

const form = reactive({
  kind: 'image' as 'image' | 'video',
  url: '',
  title: '',
  date: '',
})

function resetForm() {
  form.kind = 'image'
  form.url = ''
  form.title = ''
  form.date = ''
}

function openAdd() {
  editingId.value = null
  resetForm()
  showEditor.value = true
}

function openEdit(item: MediaItem) {
  editingId.value = item.id
  form.kind = item.kind
  form.url = item.url
  form.title = item.title || ''
  form.date = item.date || ''
  showEditor.value = true
}

async function onFilePick(e: Event) {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  saving.value = true
  try {
    const { url, kind } = await uploadFile(file)
    form.url = url
    form.kind = kind
  } catch (err: any) {
    alert('上传失败：' + (err?.message || err))
  } finally {
    saving.value = false
  }
}

async function save() {
  if (!form.url) {
    alert('请先选择文件，或填写链接')
    return
  }
  saving.value = true
  try {
    const payload = { kind: form.kind, url: form.url, title: form.title.trim(), date: form.date }
    if (editingId.value) await updateItem(editingId.value, payload)
    else await addItem(payload)
    showEditor.value = false
  } catch (err: any) {
    alert('保存失败：' + (err?.message || err))
  } finally {
    saving.value = false
  }
}

async function confirmRemove(item: MediaItem) {
  if (confirm('确定删除这张吗？')) await removeItem(item.id)
}
</script>

<template>
  <div class="flex h-full flex-col">
    <div class="flex shrink-0 items-center justify-between">
      <h2 class="text-sm font-medium tracking-wide text-slate-400">图片墙</h2>
      <button
        class="flex h-7 w-7 items-center justify-center rounded-full bg-sky text-white transition hover:bg-sky-deep active:scale-95"
        title="添加"
        @click="openAdd"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" class="h-4 w-4">
          <path d="M12 5v14M5 12h14" stroke-linecap="round" />
        </svg>
      </button>
    </div>

    <div class="mt-3 flex-1 overflow-y-auto pr-1">
      <div v-if="media.length" class="columns-2 gap-2.5 [&>*]:mb-2.5 sm:columns-3">
        <figure
          v-for="item in media"
          :key="item.id"
          class="group relative break-inside-avoid overflow-hidden rounded-xl bg-white shadow-sm"
        >
          <img v-if="item.kind === 'image'" :src="item.url" :alt="item.title" loading="lazy" class="w-full" />
          <video v-else :src="item.url" controls preload="metadata" class="w-full" />

          <figcaption v-if="item.title || item.date" class="px-2.5 py-1.5">
            <p v-if="item.title" class="truncate text-xs font-medium text-slate-700">{{ item.title }}</p>
            <p v-if="item.date" class="text-[10px] tabular-nums text-slate-400">{{ item.date }}</p>
          </figcaption>

          <div class="absolute right-1.5 top-1.5 flex gap-1 opacity-0 transition group-hover:opacity-100">
            <button class="flex h-6 w-6 items-center justify-center rounded-full bg-white/90 text-slate-600 shadow backdrop-blur hover:bg-sky hover:text-white" @click="openEdit(item)">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="h-3 w-3">
                <path d="M12 20h9M16.5 3.5a2.12 2.12 0 013 3L7 19l-4 1 1-4 12.5-12.5z" stroke-linecap="round" stroke-linejoin="round" />
              </svg>
            </button>
            <button class="flex h-6 w-6 items-center justify-center rounded-full bg-white/90 text-slate-600 shadow backdrop-blur hover:bg-rose-500 hover:text-white" @click="confirmRemove(item)">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="h-3 w-3">
                <path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m2 0v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6" stroke-linecap="round" stroke-linejoin="round" />
              </svg>
            </button>
          </div>
        </figure>
      </div>

      <div v-else class="flex h-full flex-col items-center justify-center text-center text-slate-300">
        <span class="text-2xl">🖼️</span>
        <p class="mt-2 text-xs">点右上角 + 添加第一张</p>
      </div>
    </div>

    <Teleport to="body">
      <div v-if="showEditor" class="fixed inset-0 z-[200] flex items-center justify-center p-4">
        <div class="absolute inset-0 bg-slate-900/30 backdrop-blur-sm" @click="showEditor = false" />
        <div class="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
          <h3 class="text-base font-semibold text-slate-700">{{ editingId ? '编辑' : '添加' }}</h3>

          <div v-if="form.url" class="mt-4 overflow-hidden rounded-xl border border-slate-100">
            <img v-if="form.kind === 'image'" :src="form.url" class="max-h-48 w-full object-cover" />
            <video v-else :src="form.url" controls class="max-h-48 w-full" />
          </div>

          <div class="mt-4">
            <label class="text-xs font-medium text-slate-500">导入图片 / 视频</label>
            <input
              type="file"
              accept="image/*,video/*"
              class="mt-1.5 block w-full text-xs text-slate-500 file:mr-3 file:cursor-pointer file:rounded-full file:border-0 file:bg-sky/10 file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-sky"
              @change="onFilePick"
            />
            <p v-if="saving" class="mt-1 text-xs text-cyan">处理中…</p>
          </div>

          <input v-model="form.url" type="text" placeholder="或粘贴链接 https://..." class="mt-3 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-sky" />

          <div class="mt-3 grid gap-2">
            <input v-model="form.title" type="text" placeholder="标题" class="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-sky" />
            <input v-model="form.date" type="date" class="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-500 outline-none focus:border-sky" />
          </div>

          <div class="mt-5 flex justify-end gap-2">
            <button class="rounded-full px-4 py-2 text-sm text-slate-400 hover:bg-slate-100" @click="showEditor = false">取消</button>
            <button :disabled="saving" class="rounded-full bg-sky px-5 py-2 text-sm font-medium text-white hover:bg-sky-deep active:scale-95 disabled:opacity-50" @click="save">保存</button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>
