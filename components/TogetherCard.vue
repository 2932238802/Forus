<script setup lang="ts">
import { siteConfig } from '~/data/site'
import { togetherDays, daysUntil, formatDate } from '~/utils/date'
import { usePassphrase } from '~/composables/usePassphrase'

const days = togetherDays()
const until = daysUntil(siteConfig.nextAnniversary)

const { lock } = usePassphrase()
function leave() {
  lock()
  if (import.meta.client) location.reload()
}
</script>

<template>
  <div class="flex flex-col">
    <div class="flex items-start justify-between">
      <div>
        <h1 class="text-3xl font-light tracking-[0.2em] text-slate-100">{{ siteConfig.name }}</h1>
        <p class="mt-1 text-xs tracking-wide text-slate-400">
          {{ siteConfig.you }} &amp; {{ siteConfig.npy }}
        </p>
      </div>
      <button class="text-slate-500 transition hover:text-slate-300" title="上锁离开" @click="leave">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" class="h-4 w-4">
          <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9" stroke-linecap="round" stroke-linejoin="round" />
        </svg>
      </button>
    </div>

    <div class="my-8">
      <p class="text-[11px] tracking-[0.3em] text-slate-400">在一起</p>
      <div class="mt-2 flex items-baseline gap-2">
        <span class="text-6xl font-extralight tabular-nums text-gradient">{{ days }}</span>
        <span class="text-lg font-light text-slate-400">天</span>
      </div>
      <p class="mt-2 text-xs tracking-wide text-slate-500">
        始于 {{ formatDate(siteConfig.startDate) }}
      </p>
    </div>

    <div class="border-t border-white/10 pt-3 text-xs tracking-wide text-slate-400">
      <span v-if="until > 0">距 {{ siteConfig.nextAnniversaryLabel }} · {{ until }} 天</span>
      <span v-else-if="until === 0" class="text-sky-300">今天 · {{ siteConfig.nextAnniversaryLabel }}</span>
    </div>
  </div>
</template>
