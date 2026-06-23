<script setup lang="ts">
import { ref, reactive } from 'vue'
import type { Milestone } from '~/types'
import { useMilestones } from '~/composables/useMilestones'
import { formatDate } from '~/utils/date'

const { milestones, addMilestone, updateMilestone, removeMilestone } = useMilestones()

// 预设 emoji（点选，不用自己打）
const EMOJIS = ['🤍', '💙', '❤️', '💕', '🌹', '🎬', '🌊', '✈️', '🎂', '🎄', '🎆', '⭐', '🌙', '☕', '🍰', '📸']

const showEditor = ref(false)
const editingId = ref<string | null>(null)
const form = reactive({ title: '', date: '', emoji: '🤍', type: 'daily' as Milestone['type'] })

function openAdd() {
  editingId.value = null
  form.title = ''
  form.date = ''
  form.emoji = '🤍'
  form.type = 'daily'
  showEditor.value = true
}

function openEdit(m: Milestone) {
  editingId.value = m.id
  form.title = m.title
  form.date = m.date
  form.emoji = m.emoji || '🤍'
  form.type = m.type
  showEditor.value = true
}

async function save() {
  if (!form.title.trim() || !form.date) return
  const payload = { title: form.title.trim(), date: form.date, emoji: form.emoji, type: form.type }
  if (editingId.value) await updateMilestone(editingId.value, payload)
  else await addMilestone(payload)
  showEditor.value = false
}
</script>

<template>
  <div class="flex h-full flex-col">
    <div class="mb-2 flex shrink-0 justify-end">
      <button
        class="flex h-7 w-7 items-center justify-center rounded-full bg-sky-500 text-white transition hover:bg-sky-400 active:scale-95"
        title="添加节点"
        @click="openAdd"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" class="h-4 w-4">
          <path d="M12 5v14M5 12h14" stroke-linecap="round" />
        </svg>
      </button>
    </div>

    <div class="flex-1 overflow-y-auto pr-1">
      <ul class="space-y-3">
        <li v-for="m in milestones" :key="m.id" class="group flex items-center gap-3">
          <span class="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white/5 text-sm">
            {{ m.emoji || '🤍' }}
          </span>
          <div class="min-w-0 flex-1 cursor-pointer" @click="openEdit(m)">
            <p class="truncate text-sm font-medium text-slate-200 transition group-hover:text-sky-300">
              {{ m.title }}
            </p>
            <p class="text-[11px] tabular-nums tracking-wide text-slate-500">{{ formatDate(m.date) }}</p>
          </div>
          <div class="flex shrink-0 gap-1 opacity-0 transition group-hover:opacity-100">
            <button class="text-slate-500 hover:text-sky-300" title="编辑" @click="openEdit(m)">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="h-3.5 w-3.5">
                <path d="M12 20h9M16.5 3.5a2.12 2.12 0 013 3L7 19l-4 1 1-4 12.5-12.5z" stroke-linecap="round" stroke-linejoin="round" />
              </svg>
            </button>
            <button class="text-slate-500 hover:text-rose-400" title="删除" @click="removeMilestone(m.id)">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="h-3.5 w-3.5">
                <path d="M18 6L6 18M6 6l12 12" stroke-linecap="round" />
              </svg>
            </button>
          </div>
        </li>
      </ul>
      <p v-if="!milestones.length" class="pt-6 text-center text-xs text-slate-600">还没有节点</p>
    </div>

    <!-- 编辑弹窗 -->
    <Teleport to="body">
      <div v-if="showEditor" class="fixed inset-0 z-[200] flex items-center justify-center p-4">
        <div class="absolute inset-0 bg-black/60 backdrop-blur-sm" @click="showEditor = false" />
        <div class="relative w-full max-w-sm rounded-2xl border border-white/10 bg-slate-900 p-6 shadow-2xl">
          <h3 class="text-base font-semibold text-slate-100">{{ editingId ? '编辑节点' : '添加节点' }}</h3>

          <!-- emoji 选择器 -->
          <p class="mt-4 text-xs text-slate-400">选择图标</p>
          <div class="mt-2 grid grid-cols-8 gap-1.5">
            <button
              v-for="e in EMOJIS"
              :key="e"
              type="button"
              class="flex h-8 w-8 items-center justify-center rounded-lg text-base transition"
              :class="form.emoji === e ? 'bg-sky-500/30 ring-1 ring-sky-400' : 'bg-white/5 hover:bg-white/10'"
              @click="form.emoji = e"
            >
              {{ e }}
            </button>
          </div>

          <div class="mt-4 grid gap-2">
            <input
              v-model="form.title"
              placeholder="节点名称"
              class="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-100 outline-none focus:border-sky-400"
            />
            <input
              v-model="form.date"
              type="date"
              class="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-300 outline-none focus:border-sky-400"
            />
          </div>

          <div class="mt-5 flex justify-end gap-2">
            <button class="rounded-full px-4 py-2 text-sm text-slate-400 hover:bg-white/5" @click="showEditor = false">取消</button>
            <button class="rounded-full bg-sky-500 px-5 py-2 text-sm font-medium text-white hover:bg-sky-400 active:scale-95" @click="save">保存</button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>
