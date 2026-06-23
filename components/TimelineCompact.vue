<script setup lang="ts">
import { ref, reactive } from 'vue'
import { useMilestones } from '~/composables/useMilestones'
import { formatDate } from '~/utils/date'

const { milestones, addMilestone, removeMilestone } = useMilestones()

const showAdd = ref(false)
const form = reactive({ title: '', date: '', emoji: '🤍', type: 'daily' as const })

async function save() {
  if (!form.title.trim() || !form.date) return
  await addMilestone({ title: form.title.trim(), date: form.date, emoji: form.emoji, type: form.type })
  form.title = ''
  form.date = ''
  showAdd.value = false
}
</script>

<template>
  <div class="flex h-full flex-col">
    <div class="flex shrink-0 items-center justify-between">
      <h2 class="text-sm font-medium tracking-wide text-slate-400">时间线</h2>
      <button
        class="flex h-7 w-7 items-center justify-center rounded-full bg-sky text-white transition hover:bg-sky-deep active:scale-95"
        title="添加节点"
        @click="showAdd = !showAdd"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" class="h-4 w-4">
          <path d="M12 5v14M5 12h14" stroke-linecap="round" />
        </svg>
      </button>
    </div>

    <!-- 快速添加 -->
    <div v-if="showAdd" class="mt-3 flex shrink-0 flex-wrap items-center gap-2">
      <input v-model="form.emoji" class="w-12 rounded-lg border border-slate-200 px-2 py-1.5 text-center text-sm outline-none focus:border-sky" />
      <input v-model="form.title" placeholder="节点" class="min-w-0 flex-1 rounded-lg border border-slate-200 px-3 py-1.5 text-sm outline-none focus:border-sky" />
      <input v-model="form.date" type="date" class="rounded-lg border border-slate-200 px-2 py-1.5 text-sm text-slate-500 outline-none focus:border-sky" />
      <button class="rounded-lg bg-sky px-3 py-1.5 text-sm font-medium text-white hover:bg-sky-deep" @click="save">存</button>
    </div>

    <div class="mt-3 flex-1 overflow-y-auto pr-1">
      <ul class="space-y-3">
        <li v-for="m in milestones" :key="m.id" class="group flex items-center gap-3">
          <span class="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-sky/10 text-sm">
            {{ m.emoji || '🤍' }}
          </span>
          <div class="min-w-0 flex-1">
            <p class="truncate text-sm font-medium text-slate-700">{{ m.title }}</p>
            <p class="text-[11px] tabular-nums tracking-wide text-slate-400">{{ formatDate(m.date) }}</p>
          </div>
          <button
            class="shrink-0 text-slate-300 opacity-0 transition hover:text-rose-400 group-hover:opacity-100"
            @click="removeMilestone(m.id)"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="h-3.5 w-3.5">
              <path d="M18 6L6 18M6 6l12 12" stroke-linecap="round" />
            </svg>
          </button>
        </li>
      </ul>
      <p v-if="!milestones.length" class="pt-6 text-center text-xs text-slate-300">还没有节点</p>
    </div>
  </div>
</template>
