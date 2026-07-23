<script setup lang="ts">
import { usePushbacks } from '~/composables/usePushbacks'

const { pushbacks } = usePushbacks()

function fmt(at: number) {
  const d = new Date(at)
  const now = Date.now()
  const diff = now - at
  const mins = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)
  if (mins < 1) return '刚刚'
  if (mins < 60) return `${mins} 分钟前`
  if (hours < 24) return `${hours} 小时前`
  if (days === 1) return '昨天'
  if (days < 7) return `${days} 天前`
  return `${d.getMonth() + 1}/${d.getDate()}`
}
</script>

<template>
  <div class="space-y-2">
    <div
      v-for="p in pushbacks.slice(0, 8)"
      :key="p.id"
      class="rounded-lg border border-rose-400/10 bg-rose-400/5 px-3 py-2.5"
    >
      <span class="mb-1 block text-xs tabular-nums text-rose-400/60">{{ fmt(p.at) }}</span>
      <p class="break-words text-sm leading-relaxed text-slate-200">
        <span class="text-rose-400/50">「</span>{{ p.text }}<span class="text-rose-400/50">」</span>
      </p>
      <p v-if="p.note" class="mt-1 truncate text-xs text-slate-500">{{ p.note }}</p>
    </div>
    <div v-if="!pushbacks.length" class="py-6 text-center text-xs text-slate-500">
      还没有记录
    </div>
    <div v-if="pushbacks.length > 8" class="pt-1 text-center text-[11px] text-slate-500">
      还有 {{ pushbacks.length - 8 }} 条…
    </div>
  </div>
</template>
