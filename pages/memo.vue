<script setup lang="ts">
import { ref } from 'vue'
import { useMemo } from '~/composables/useMemo'

definePageMeta({ middleware: 'unlocked' })

const { memos, addMemo, toggleMemo, removeMemo } = useMemo()
const text = ref('')

function submit() {
  if (!text.value.trim()) return
  addMemo(text.value)
  text.value = ''
}
</script>

<template>
  <div>
    <NavBar />
    <div class="mx-auto w-full max-w-2xl p-4 sm:p-6">
      <div class="night-card p-6">
        <h1 class="text-lg font-medium tracking-wide text-slate-100">备忘录</h1>
        <p class="mt-1 text-xs text-slate-500">随手记下要做的事</p>

        <!-- 输入 -->
        <form class="mt-5 flex gap-2" @submit.prevent="submit">
          <input
            v-model="text"
            type="text"
            placeholder="记一条…"
            class="min-w-0 flex-1 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-100 outline-none focus:border-sky-400"
          />
          <button
            type="submit"
            class="shrink-0 rounded-lg bg-sky-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-sky-400 active:scale-95"
          >
            添加
          </button>
        </form>

        <!-- 列表 -->
        <ul class="mt-5 space-y-2">
          <li
            v-for="m in memos"
            :key="m.id"
            class="group flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-3 py-2.5"
          >
            <input
              type="checkbox"
              :checked="m.done"
              class="h-4 w-4 shrink-0 accent-sky-500"
              @change="toggleMemo(m.id, !m.done)"
            />
            <span class="flex-1 text-sm" :class="m.done ? 'text-slate-500 line-through' : 'text-slate-200'">
              {{ m.text }}
            </span>
            <button
              class="shrink-0 text-slate-600 opacity-0 transition hover:text-rose-400 group-hover:opacity-100"
              @click="removeMemo(m.id)"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="h-4 w-4">
                <path d="M18 6L6 18M6 6l12 12" stroke-linecap="round" />
              </svg>
            </button>
          </li>
        </ul>
        <p v-if="!memos.length" class="mt-8 text-center text-xs text-slate-600">还没有备忘</p>
      </div>
    </div>
  </div>
</template>
