<script setup lang="ts">
import { ref } from 'vue'
import { siteConfig } from '~/data/site'
import { useLikes } from '~/composables/useLikes'

definePageMeta({ middleware: 'unlocked' })

const { likes, addLike, removeLike } = useLikes()

const people = [siteConfig.npy, siteConfig.you]
// 每个人的两个输入框：like / dislike
const inputs = ref<Record<string, { like: string; dislike: string }>>({
  [people[0]]: { like: '', dislike: '' },
  [people[1]]: { like: '', dislike: '' },
})

function submit(owner: string, kind: 'like' | 'dislike') {
  const t = inputs.value[owner][kind]
  if (!t?.trim()) return
  addLike(owner, kind, t)
  inputs.value[owner][kind] = ''
}

function items(owner: string, kind: 'like' | 'dislike') {
  return likes.value.filter((l) => l.owner === owner && l.kind === kind)
}

function confirmRemove(id: string, name: string) {
  if (confirm(`删除「${name}」？`)) removeLike(id)
}
</script>

<template>
  <div>
    <NavBar />
    <div class="mx-auto w-full max-w-[1600px] p-4 sm:p-6">
      <div class="mb-4 px-1">
        <h1 class="text-lg font-medium tracking-wide text-slate-100">Like And Unlike</h1>
        <p class="mt-1 text-xs text-slate-500">记录彼此喜欢和不喜欢的东西</p>
      </div>

      <div class="grid gap-4 md:grid-cols-2">
        <!-- 每个人一栏 -->
        <div v-for="owner in people" :key="owner" class="night-card p-5">
          <h2 class="accent-text text-sm font-medium tracking-wide">{{ owner }}</h2>

          <!-- 喜欢 -->
          <div class="mt-4">
            <p class="mb-2 flex items-center gap-1.5 text-xs font-medium text-emerald-400">
              <span>♥</span> 喜欢
            </p>
            <form class="flex gap-2" @submit.prevent="submit(owner, 'like')">
              <input
                v-model="inputs[owner].like"
                type="text"
                maxlength="60"
                placeholder="喜欢的东西…"
                class="min-w-0 flex-1 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-100 outline-none focus:border-emerald-400"
              />
              <button type="submit" class="shrink-0 rounded-lg bg-emerald-500/90 px-3 py-2 text-sm font-medium text-white transition hover:bg-emerald-400 active:scale-95">加</button>
            </form>
            <ul class="mt-3 space-y-1.5">
              <li
                v-for="l in items(owner, 'like')"
                :key="l.id"
                class="group flex items-center gap-2 rounded-lg border border-emerald-400/15 bg-emerald-400/5 px-3 py-1.5"
              >
                <span class="flex-1 text-sm text-slate-200">{{ l.text }}</span>
                <button class="shrink-0 text-slate-600 opacity-0 transition hover:text-rose-400 group-hover:opacity-100" @click="confirmRemove(l.id, l.text)">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="h-3.5 w-3.5"><path d="M18 6L6 18M6 6l12 12" stroke-linecap="round" /></svg>
                </button>
              </li>
            </ul>
          </div>

          <!-- 不喜欢 -->
          <div class="mt-5">
            <p class="mb-2 flex items-center gap-1.5 text-xs font-medium text-rose-400">
              <span>✕</span> 不喜欢
            </p>
            <form class="flex gap-2" @submit.prevent="submit(owner, 'dislike')">
              <input
                v-model="inputs[owner].dislike"
                type="text"
                maxlength="60"
                placeholder="不喜欢的东西…"
                class="min-w-0 flex-1 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-100 outline-none focus:border-rose-400"
              />
              <button type="submit" class="shrink-0 rounded-lg bg-rose-500/90 px-3 py-2 text-sm font-medium text-white transition hover:bg-rose-400 active:scale-95">加</button>
            </form>
            <ul class="mt-3 space-y-1.5">
              <li
                v-for="l in items(owner, 'dislike')"
                :key="l.id"
                class="group flex items-center gap-2 rounded-lg border border-rose-400/15 bg-rose-400/5 px-3 py-1.5"
              >
                <span class="flex-1 text-sm text-slate-200">{{ l.text }}</span>
                <button class="shrink-0 text-slate-600 opacity-0 transition hover:text-rose-400 group-hover:opacity-100" @click="confirmRemove(l.id, l.text)">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="h-3.5 w-3.5"><path d="M18 6L6 18M6 6l12 12" stroke-linecap="round" /></svg>
                </button>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
