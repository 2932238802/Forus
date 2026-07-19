<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { useDiaries, type Diary } from '~/composables/useDiaries'
import { useIdentity, type IdentityKey } from '~/composables/useIdentity'

definePageMeta({ middleware: 'unlocked' })

const { diaries, addDiary, updateDiary, removeDiary } = useDiaries()
const { identityKey, nameOf, load: loadIdentity } = useIdentity()

onMounted(() => loadIdentity())

const MOODS = ['🤍', '🥳', '🌙', '💗', '☁️', '✨']
const IDENTITY_KEYS: IdentityKey[] = ['npy', 'you']
const filter = ref<'all' | IdentityKey>('all')
const showEditor = ref(false)
const editingId = ref<string | null>(null)
const saving = ref(false)
const form = reactive({ happenedOn: '', title: '', content: '', mood: '🤍', imageUrl: '' })

const list = computed(() => filter.value === 'all'
  ? diaries.value
  : diaries.value.filter((d) => d.owner === filter.value))

function dateString(date = new Date()) {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}
function formatDate(date: string) {
  const [, month, day] = date.split('-')
  return `${Number(month)} 月 ${Number(day)} 日`
}
function resetForm() {
  form.happenedOn = dateString()
  form.title = ''
  form.content = ''
  form.mood = '🤍'
  form.imageUrl = ''
}
function openNew() {
  editingId.value = null
  resetForm()
  showEditor.value = true
}
function openEdit(diary: Diary) {
  editingId.value = diary.id
  form.happenedOn = diary.happenedOn
  form.title = diary.title
  form.content = diary.content
  form.mood = diary.mood
  form.imageUrl = diary.imageUrl
  showEditor.value = true
}
async function save() {
  if (!identityKey.value || !form.content.trim()) return
  saving.value = true
  const payload = {
    owner: identityKey.value,
    happenedOn: form.happenedOn || dateString(),
    title: form.title,
    content: form.content,
    mood: form.mood,
    imageUrl: form.imageUrl,
  }
  try {
    if (editingId.value) await updateDiary(editingId.value, payload)
    else await addDiary(payload)
    showEditor.value = false
  } catch (error: any) {
    alert('保存失败：' + (error?.message || error))
  } finally {
    saving.value = false
  }
}
function confirmRemove(diary: Diary) {
  if (confirm('删除这段回忆？')) removeDiary(diary.id)
}
</script>

<template>
  <div>
    <NavBar />
    <main class="mx-auto w-full max-w-5xl p-4 sm:p-6">
      <div class="mb-5 flex items-center justify-between gap-4">
        <div class="flex items-center gap-3">
          <span class="text-2xl">✦</span>
          <h1 class="page-title">回忆日记</h1>
        </div>
        <button class="surface-button rounded-full px-4 py-2 text-sm font-medium" @click="openNew">写下今天</button>
      </div>

      <div class="mb-5 flex w-fit gap-1 rounded-full border border-white/10 bg-white/5 p-1 text-xs">
        <button class="rounded-full px-3 py-1.5 transition" :class="filter === 'all' ? 'surface-button' : 'text-slate-400 hover:text-slate-100'" @click="filter = 'all'">全部</button>
        <button v-for="key in IDENTITY_KEYS" :key="key" class="rounded-full px-3 py-1.5 transition" :class="filter === key ? 'surface-button' : 'text-slate-400 hover:text-slate-100'" @click="filter = key">{{ nameOf(key) }}</button>
      </div>

      <section v-if="list.length" class="relative space-y-4 before:absolute before:bottom-3 before:left-[17px] before:top-3 before:w-px before:bg-gradient-to-b before:from-sky-300/40 before:via-rose-300/25 before:to-transparent sm:before:left-1/2">
        <article v-for="diary in list" :key="diary.id" class="group relative sm:grid sm:grid-cols-[1fr_44px_1fr] sm:gap-5">
          <div class="hidden sm:block" :class="diary.owner === 'you' ? 'order-3' : ''" />
          <div class="relative z-10 ml-1 flex h-8 w-8 items-center justify-center rounded-full border border-white/20 bg-slate-900 text-sm shadow-lg shadow-black/20 sm:order-2 sm:ml-0">{{ diary.mood }}</div>
          <div class="night-card ml-11 mt-[-32px] overflow-hidden p-4 sm:order-1 sm:ml-0 sm:mt-0" :class="diary.owner === 'you' ? 'sm:order-3' : ''">
            <img v-if="diary.imageUrl" :src="diary.imageUrl" class="mb-4 max-h-72 w-full rounded-xl object-cover" loading="lazy" />
            <div class="mb-2 flex items-center justify-between gap-3">
              <span class="text-[11px] font-medium tracking-wider text-slate-500">{{ formatDate(diary.happenedOn) }}</span>
              <span class="rounded-full px-2 py-0.5 text-[10px]" :class="diary.owner === 'you' ? 'bg-sky-500/15 text-sky-200' : 'bg-rose-500/15 text-rose-200'">{{ nameOf(diary.owner) }}</span>
            </div>
            <h2 v-if="diary.title" class="text-base font-medium text-slate-100">{{ diary.title }}</h2>
            <p class="mt-2 whitespace-pre-wrap break-words text-sm leading-7 text-slate-300">{{ diary.content }}</p>
            <div v-if="diary.owner === identityKey" class="mt-3 flex justify-end gap-3 opacity-0 transition group-hover:opacity-100">
              <button class="text-xs text-slate-500 hover:text-sky-300" @click="openEdit(diary)">编辑</button>
              <button class="text-xs text-slate-500 hover:text-rose-300" @click="confirmRemove(diary)">删除</button>
            </div>
          </div>
        </article>
      </section>

      <div v-else class="night-card flex min-h-64 items-center justify-center">
        <span class="text-4xl opacity-45">☾</span>
      </div>
    </main>

    <Teleport to="body">
      <div v-if="showEditor" class="fixed inset-0 z-[200] flex items-center justify-center p-4">
        <button class="absolute inset-0 cursor-default bg-black/65 backdrop-blur-sm" aria-label="关闭" @click="showEditor = false" />
        <div class="relative w-full max-w-lg rounded-3xl border border-white/10 bg-slate-950/95 p-5 shadow-2xl shadow-black/50 sm:p-6">
          <div class="flex items-center justify-between">
            <h2 class="page-title text-xl">{{ editingId ? '编辑回忆' : '记下一刻' }}</h2>
            <div class="flex gap-1">
              <button v-for="mood in MOODS" :key="mood" class="flex h-7 w-7 items-center justify-center rounded-full text-sm transition" :class="form.mood === mood ? 'bg-white/15 ring-1 ring-white/25' : 'opacity-50 hover:opacity-100'" @click="form.mood = mood">{{ mood }}</button>
            </div>
          </div>
          <div class="mt-5 grid gap-3 sm:grid-cols-[150px_1fr]">
            <input v-model="form.happenedOn" type="date" class="surface-input rounded-xl px-3 py-2 text-sm outline-none" />
            <input v-model="form.title" maxlength="80" placeholder="这一刻的标题（可留空）" class="surface-input rounded-xl px-3 py-2 text-sm outline-none" />
          </div>
          <textarea v-model="form.content" rows="8" maxlength="5000" placeholder="把这一刻留在这里…" class="surface-input mt-3 w-full resize-none rounded-xl px-3 py-2 text-sm leading-7 outline-none" />
          <input v-model="form.imageUrl" type="url" placeholder="照片链接（可留空）" class="surface-input mt-3 w-full rounded-xl px-3 py-2 text-sm outline-none" />
          <div class="mt-5 flex justify-end gap-2">
            <button class="rounded-full px-4 py-2 text-sm text-slate-400 hover:bg-white/5" @click="showEditor = false">取消</button>
            <button :disabled="saving" class="surface-button rounded-full px-5 py-2 text-sm font-medium disabled:opacity-50" @click="save">{{ saving ? '保存中' : '保存' }}</button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>
