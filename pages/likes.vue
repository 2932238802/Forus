<script setup lang="ts">
import { ref, computed } from 'vue'
import { siteConfig } from '~/data/site'
import { useLikes } from '~/composables/useLikes'

definePageMeta({ middleware: 'unlocked' })

const { likes, addLike, removeLike } = useLikes()

// 两个人
const people = [siteConfig.npy, siteConfig.you]
// 每栏各自的输入框内容
const inputs = ref<Record<string, string>>({ [people[0]]: '', [people[1]]: '' })

function listOf(owner: string) {
  return computed(() => likes.value.filter((l) => l.owner === owner))
}

function submit(owner: string) {
  const t = inputs.value[owner]
  if (!t?.trim()) return
  addLike(owner, t)
  inputs.value[owner] = ''
}
</script>

<template>
  <div>
    <NavBar />
    <div class="mx-auto w-full max-w-3xl p-4 sm:p-6">
      <div class="mb-4 px-1">
        <h1 class="text-lg font-medium tracking-wide text-slate-100">喜好兴趣</h1>
        <p class="mt-1 text-xs text-slate-500">记录彼此喜欢的东西</p>
      </div>

      <div class="grid gap-4 sm:grid-cols-2">
        <!-- 每个人一栏 -->
        <div v-for="owner in people" :key="owner" class="night-card p-5">
          <h2 class="accent-text text-sm font-medium tracking-wide">{{ owner }} 喜欢</h2>

          <form class="mt-4 flex gap-2" @submit.prevent="submit(owner)">
            <input
              v-model="inputs[owner]"
              type="text"
              placeholder="喜欢的东西…"
              class="min-w-0 flex-1 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-100 outline-none focus:border-sky-400"
            />
            <button
              type="submit"
              class="shrink-0 rounded-lg bg-sky-500 px-3 py-2 text-sm font-medium text-white transition hover:bg-sky-400 active:scale-95"
            >
              加
            </button>
          </form>

          <ul class="mt-4 space-y-2">
            <li
              v-for="l in likes.filter((x) => x.owner === owner)"
              :key="l.id"
              class="group flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2"
            >
              <span class="flex-1 text-sm text-slate-200">{{ l.text }}</span>
              <button
                class="shrink-0 text-slate-600 opacity-0 transition hover:text-rose-400 group-hover:opacity-100"
                @click="removeLike(l.id)"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="h-3.5 w-3.5">
                  <path d="M18 6L6 18M6 6l12 12" stroke-linecap="round" />
                </svg>
              </button>
            </li>
          </ul>
        </div>
      </div>
    </div>
  </div>
</template>
