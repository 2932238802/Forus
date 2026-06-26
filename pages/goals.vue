<script setup lang="ts">
import { ref } from 'vue'
import { useGoals } from '~/composables/useGoals'

definePageMeta({ middleware: 'unlocked' })

const { goals, addGoal, toggleGoal, removeGoal } = useGoals()
const title = ref('')

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
      <div class="night-card p-6">
        <h1 class="text-lg font-medium tracking-wide text-slate-100">我们的目标</h1>
        <p class="mt-1 text-xs text-slate-500">想一起完成的事，达成了就打勾 ✨</p>

        <form class="mt-5 flex gap-2" @submit.prevent="submit">
          <input
            v-model="title"
            type="text"
            maxlength="100"
            placeholder="想一起做的事…"
            class="min-w-0 flex-1 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-100 outline-none focus:border-sky-400"
          />
          <button
            type="submit"
            class="shrink-0 rounded-lg bg-sky-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-sky-400 active:scale-95"
          >
            添加
          </button>
        </form>

        <ul class="mt-5 grid gap-2.5 sm:grid-cols-2">
          <li
            v-for="g in goals"
            :key="g.id"
            class="group relative flex items-start gap-3 rounded-xl border border-white/10 bg-white/5 p-4"
          >
            <button
              class="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition"
              :class="g.done ? 'accent-bg border-transparent text-white' : 'border-white/30 text-transparent'"
              @click="toggleGoal(g.id, !g.done)"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" class="h-3 w-3">
                <path d="M5 13l4 4L19 7" stroke-linecap="round" stroke-linejoin="round" />
              </svg>
            </button>
            <span class="flex-1 text-sm" :class="g.done ? 'text-slate-500 line-through' : 'text-slate-200'">
              {{ g.title }}
            </span>
            <button
              class="absolute right-2 top-2 text-slate-600 opacity-0 transition hover:text-rose-400 group-hover:opacity-100"
              @click="confirmRemove(g.id, g.title)"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="h-4 w-4">
                <path d="M18 6L6 18M6 6l12 12" stroke-linecap="round" />
              </svg>
            </button>
          </li>
        </ul>
        <p v-if="!goals.length" class="mt-8 text-center text-xs text-slate-600">还没有目标</p>
      </div>
    </div>
  </div>
</template>
