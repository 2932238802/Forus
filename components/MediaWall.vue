<script setup lang="ts">
import { ref, reactive, computed, watch, onUnmounted } from 'vue'
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

// ============ 大图查看器（Lightbox）============
const viewerIndex = ref<number | null>(null)
const viewing = computed(() =>
  viewerIndex.value !== null ? media.value[viewerIndex.value] ?? null : null,
)

function openViewer(item: MediaItem) {
  const i = media.value.findIndex((m) => m.id === item.id)
  if (i >= 0) viewerIndex.value = i
}
function closeViewer() {
  viewerIndex.value = null
}
function prev() {
  if (viewerIndex.value === null) return
  viewerIndex.value = (viewerIndex.value - 1 + media.value.length) % media.value.length
}
function next() {
  if (viewerIndex.value === null) return
  viewerIndex.value = (viewerIndex.value + 1) % media.value.length
}

// 键盘：← → 切换，Esc 关闭；查看器打开时锁定页面滚动
function onKey(e: KeyboardEvent) {
  if (viewerIndex.value === null) return
  if (e.key === 'Escape') closeViewer()
  else if (e.key === 'ArrowLeft') prev()
  else if (e.key === 'ArrowRight') next()
}
watch(viewerIndex, (v) => {
  if (typeof window === 'undefined') return
  if (v !== null) {
    window.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
  } else {
    window.removeEventListener('keydown', onKey)
    document.body.style.overflow = ''
  }
})
onUnmounted(() => {
  if (typeof window !== 'undefined') {
    window.removeEventListener('keydown', onKey)
    document.body.style.overflow = ''
  }
})

// 手机：左右滑动切换
let touchStartX = 0
function onTouchStart(e: TouchEvent) {
  touchStartX = e.changedTouches[0].clientX
}
function onTouchEnd(e: TouchEvent) {
  const dx = e.changedTouches[0].clientX - touchStartX
  if (Math.abs(dx) > 50) {
    if (dx > 0) prev()
    else next()
  }
}
</script>

<template>
  <div class="flex h-full flex-col">
    <div class="mb-2 flex shrink-0 justify-end">
      <button
        class="flex h-7 w-7 items-center justify-center rounded-full bg-sky-500 text-white transition hover:bg-sky-400 active:scale-95"
        title="添加"
        @click="openAdd"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" class="h-4 w-4">
          <path d="M12 5v14M5 12h14" stroke-linecap="round" />
        </svg>
      </button>
    </div>

    <div class="flex-1 overflow-y-auto pr-1">
      <div v-if="media.length" class="columns-2 gap-2.5 [&>*]:mb-2.5 sm:columns-3">
        <figure
          v-for="item in media"
          :key="item.id"
          class="group relative break-inside-avoid overflow-hidden rounded-xl bg-white/5 shadow-sm"
        >
          <img
            v-if="item.kind === 'image'"
            :src="item.url"
            :alt="item.title"
            loading="lazy"
            class="w-full cursor-zoom-in transition group-hover:opacity-95"
            @click="openViewer(item)"
          />
          <div v-else class="relative">
            <video :src="item.url" preload="metadata" class="w-full" />
            <!-- 视频点击遮罩：打开大图播放 -->
            <button
              class="absolute inset-0 flex items-center justify-center bg-black/20 transition hover:bg-black/30"
              title="播放"
              @click="openViewer(item)"
            >
              <span class="flex h-12 w-12 items-center justify-center rounded-full bg-black/50 backdrop-blur">
                <svg viewBox="0 0 24 24" fill="currentColor" class="ml-0.5 h-6 w-6 text-white"><path d="M8 5v14l11-7z" /></svg>
              </span>
            </button>
          </div>

          <figcaption v-if="item.title || item.date" class="px-2.5 py-1.5">
            <p v-if="item.title" class="truncate text-xs font-medium text-slate-200">{{ item.title }}</p>
            <p v-if="item.date" class="text-[10px] tabular-nums text-slate-500">{{ item.date }}</p>
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

      <div v-else class="flex h-full flex-col items-center justify-center text-center text-slate-600">
        <span class="text-2xl">🖼️</span>
        <p class="mt-2 text-xs">点右上角 + 添加第一张</p>
      </div>
    </div>

    <Teleport to="body">
      <div v-if="showEditor" class="fixed inset-0 z-[200] flex items-center justify-center p-4">
        <div class="absolute inset-0 bg-black/60 backdrop-blur-sm" @click="showEditor = false" />
        <div class="relative w-full max-w-md rounded-2xl border border-white/10 bg-slate-900 p-6 shadow-2xl">
          <h3 class="text-base font-semibold text-slate-100">{{ editingId ? '编辑' : '添加' }}</h3>

          <div v-if="form.url" class="mt-4 overflow-hidden rounded-xl border border-white/10">
            <img v-if="form.kind === 'image'" :src="form.url" class="max-h-48 w-full object-cover" />
            <video v-else :src="form.url" controls class="max-h-48 w-full" />
          </div>

          <div class="mt-4">
            <label class="text-xs font-medium text-slate-400">导入图片 / 视频</label>
            <input
              type="file"
              accept="image/*,video/*"
              class="mt-1.5 block w-full text-xs text-slate-400 file:mr-3 file:cursor-pointer file:rounded-full file:border-0 file:bg-sky-500/20 file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-sky-300"
              @change="onFilePick"
            />
            <p v-if="saving" class="mt-1 text-xs text-sky-300">处理中…</p>
          </div>

          <input v-model="form.url" type="text" placeholder="或粘贴链接 https://..." class="mt-3 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-100 outline-none focus:border-sky-400" />

          <div class="mt-3 grid gap-2">
            <input v-model="form.title" type="text" placeholder="标题" class="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-100 outline-none focus:border-sky-400" />
            <input v-model="form.date" type="date" class="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-300 outline-none focus:border-sky-400" />
          </div>

          <div class="mt-5 flex justify-end gap-2">
            <button class="rounded-full px-4 py-2 text-sm text-slate-400 hover:bg-white/5" @click="showEditor = false">取消</button>
            <button :disabled="saving" class="rounded-full bg-sky-500 px-5 py-2 text-sm font-medium text-white hover:bg-sky-400 active:scale-95 disabled:opacity-50" @click="save">保存</button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- 大图查看器 Lightbox -->
    <Teleport to="body">
      <Transition name="viewer-fade">
        <div
          v-if="viewing"
          class="fixed inset-0 z-[300] flex items-center justify-center"
          @touchstart="onTouchStart"
          @touchend="onTouchEnd"
        >
          <!-- 背景 -->
          <div class="absolute inset-0 bg-black/90" @click="closeViewer" />

          <!-- 关闭 -->
          <button
            class="absolute right-4 top-4 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20"
            title="关闭 (Esc)"
            @click="closeViewer"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="h-5 w-5"><path d="M18 6L6 18M6 6l12 12" stroke-linecap="round" /></svg>
          </button>

          <!-- 上一张 -->
          <button
            v-if="media.length > 1"
            class="absolute left-2 z-10 flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20 sm:left-5"
            title="上一张 (←)"
            @click.stop="prev"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="h-6 w-6"><path d="M15 18l-6-6 6-6" stroke-linecap="round" stroke-linejoin="round" /></svg>
          </button>
          <!-- 下一张 -->
          <button
            v-if="media.length > 1"
            class="absolute right-2 z-10 flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20 sm:right-5"
            title="下一张 (→)"
            @click.stop="next"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="h-6 w-6"><path d="M9 18l6-6-6-6" stroke-linecap="round" stroke-linejoin="round" /></svg>
          </button>

          <!-- 内容 -->
          <div class="relative z-[1] flex max-h-[90vh] max-w-[92vw] flex-col items-center" @click.stop>
            <img
              v-if="viewing.kind === 'image'"
              :src="viewing.url"
              :alt="viewing.title"
              class="max-h-[82vh] max-w-[92vw] rounded-lg object-contain"
            />
            <video
              v-else
              :src="viewing.url"
              controls
              autoplay
              class="max-h-[82vh] max-w-[92vw] rounded-lg"
            />
            <!-- 标题/日期 -->
            <div v-if="viewing.title || viewing.date" class="mt-3 text-center">
              <p v-if="viewing.title" class="text-sm font-medium text-white">{{ viewing.title }}</p>
              <p v-if="viewing.date" class="text-xs tabular-nums text-white/50">{{ viewing.date }}</p>
            </div>
            <!-- 序号 -->
            <p v-if="media.length > 1" class="mt-2 text-[11px] tabular-nums text-white/40">
              {{ (viewerIndex ?? 0) + 1 }} / {{ media.length }}
            </p>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<style scoped>
.viewer-fade-enter-active,
.viewer-fade-leave-active {
  transition: opacity 0.25s ease;
}
.viewer-fade-enter-from,
.viewer-fade-leave-to {
  opacity: 0;
}
</style>
