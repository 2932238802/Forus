<script setup lang="ts">
import { ref, computed } from 'vue'
import { useGoals } from '~/composables/useGoals'

definePageMeta({ middleware: 'unlocked' })

const { goals, addGoal, toggleGoal, removeGoal } = useGoals()
const title = ref('')

const total = computed(() => goals.value.length)
const doneCount = computed(() => goals.value.filter((g) => g.done).length)
const percent = computed(() => (total.value ? Math.round((doneCount.value / total.value) * 100) : 0))

function submit() {
  if (!title.value.trim()) return
  addGoal(title.value)
  title.value = ''
}

function confirmRemove(id: string, name: string) {
  if (confirm(`删除目标「${name}」？`)) removeGoal(id)
}
</script>

<template>
  <div>
    <NavBar />
    <div class="mx-auto w-full max-w-2xl p-4 sm:p-6">
      <div class="night-card overflow-hidden p-6">
        <!-- 标题 + 进度环 -->
        <div class="flex items-center justify-between">
          <h1 class="bg-gradient-to-r from-sky-300 via-cyan-300 to-sky-400 bg-clip-text text-2xl font-semibold tracking-wide text-transparent">
            !TARGET!
          </h1>
          <div v-if="total" class="relative h-12 w-12 shrink-0">
            <svg viewBox="0 0 36 36" class="h-12 w-12 -rotate-90">
              <circle cx="18" cy="18" r="15.9" fill="none" stroke="rgba(255,255,255,0.08)" stroke-width="3" />
              <circle
                cx="18" cy="18" r="15.9" fill="none" stroke="url(#g)" stroke-width="3" stroke-linecap="round"
                :stroke-dasharray="`${percent}, 100`"
                class="transition-all duration-500"
              />
              <defs>
                <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stop-color="#7dd3fc" />
                  <stop offset="100%" stop-color="#06b6d4" />
                </linearGradient>
              </defs>
            </svg>
            <span class="absolute inset-0 flex items-center justify-center text-[11px] font-medium text-cyan-200">
              {{ doneCount }}/{{ total }}
            </span>
          </div>
        </div>

        <!-- 输入 -->
        <form class="mt-5 flex gap-2" @submit.prevent="submit">
          <input
            v-model="title"
            type="text"
            maxlength="100"
            placeholder="想一起做的事…"
            class="min-w-0 flex-1 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-slate-100 outline-none transition focus:border-sky-400"
          />
          <button
            type="submit"
            class="shrink-0 rounded-xl bg-gradient-to-r from-sky-500 to-cyan-500 px-4 py-2.5 text-sm font-medium text-white transition hover:brightness-110 active:scale-95"
          >
            添加
          </button>
        </form>

        <!-- 目标卡片 -->
        <ul class="mt-5 grid gap-2.5 sm:grid-cols-2">
          <li
            v-for="g in goals"
            :key="g.id"
            class="group relative flex items-center gap-3 overflow-hidden rounded-2xl border p-4 transition"
            :class="g.done
              ? 'border-cyan-400/30 bg-cyan-400/5'
              : 'border-white/10 bg-white/5 hover:border-sky-400/30 hover:bg-white/[0.07]'"
          >
            <button
              class="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 transition active:scale-90"
              :class="g.done
                ? 'border-transparent bg-gradient-to-br from-sky-400 to-cyan-500 text-white'
                : 'border-white/25 text-transparent hover:border-sky-400'"
              @click="toggleGoal(g.id, !g.done)"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" class="h-3.5 w-3.5">
                <path d="M5 13l4 4L19 7" stroke-linecap="round" stroke-linejoin="round" />
              </svg>
            </button>
            <span class="flex-1 break-words text-sm transition" :class="g.done ? 'text-slate-500 line-through' : 'text-slate-100'">
              {{ g.title }}
            </span>
            <button
              class="shrink-0 text-slate-600 opacity-0 transition hover:text-rose-400 group-hover:opacity-100"
              @click="confirmRemove(g.id, g.title)"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="h-4 w-4">
                <path d="M18 6L6 18M6 6l12 12" stroke-linecap="round" />
              </svg>
            </button>
          </li>
        </ul>

        <!-- 空态 -->
        <div v-if="!goals.length" class="py-12 text-center">
          <div class="text-4xl opacity-30">🎯</div>
        </div>
      </div>
    </div>
  </div>
</template>
