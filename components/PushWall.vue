<script setup lang="ts">
import { usePushbacks } from '~/composables/usePushbacks'

const { pushbacks } = usePushbacks()

function fmt(at: number) {
  const d = new Date(at)
  return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}
</script>

<template>
  <div class="space-y-2">
    <div
      v-for="p in pushbacks.slice(0, 8)"
      :key="p.id"
      class="rounded-lg border border-rose-400/10 bg-rose-400/5 px-3 py-2.5"
    >
      <p class="break-words text-sm leading-relaxed text-slate-200">
        <span class="text-rose-400/50">「</span>{{ p.text }}<span class="text-rose-400/50">」</span>
      </p>
      <p v-if="p.note" class="mt-1 truncate text-xs text-slate-500">{{ p.note }}</p>
      <span class="mt-1 block text-[10px] tabular-nums text-slate-600">{{ fmt(p.at) }}</span>
    </div>
    <div v-if="!pushbacks.length" class="py-6 text-center text-xs text-slate-500">
      还没有记录
    </div>
    <div v-if="pushbacks.length > 8" class="pt-1 text-center text-[11px] text-slate-500">
      还有 {{ pushbacks.length - 8 }} 条…
    </div>
  </div>
</template>
