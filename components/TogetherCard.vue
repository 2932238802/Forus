<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { siteConfig } from '~/data/site'
import { togetherDuration, nextAnniversary, formatDate, todayCelebration } from '~/utils/date'
import { usePassphrase } from '~/composables/usePassphrase'
import { useIdentity } from '~/composables/useIdentity'
import { usePokes } from '~/composables/usePokes'

// 今天是否特殊日子（用于常驻小徽章）
const celebration = todayCelebration()

// 重放彩蛋：清掉当天「已放过」标记后刷新，首页会重新触发
function replayCelebration() {
  if (import.meta.client) {
    try {
      localStorage.removeItem('forus_celebrated')
    } catch {
      /* ignore */
    }
    location.reload()
  }
}

// 实时跳动的在一起时长
const dur = ref(togetherDuration())
let timer: ReturnType<typeof setInterval> | null = null
onMounted(() => {
  loadIdentity()
  dur.value = togetherDuration()
  timer = setInterval(() => {
    dur.value = togetherDuration()
  }, 1000)
})
onUnmounted(() => {
  if (timer) clearInterval(timer)
})

const pad = (n: number) => String(n).padStart(2, '0')

// 自动计算下一个还没到的周年（过期后自动滚到下一年）
const anniv = nextAnniversary()

// 想你了
const { identityKey, partnerOf, nameOf, load: loadIdentity } = useIdentity()
const { sendPoke } = usePokes()
const poking = ref(false)
const justPoked = ref(false)

async function poke() {
  if (poking.value) return
  const me = identityKey.value
  const ta = partnerOf(me)
  if (!me || !ta) return
  poking.value = true
  try {
    await sendPoke(me, ta)
    justPoked.value = true
    setTimeout(() => (justPoked.value = false), 2600)
  } catch {
    /* 静默失败 */
  } finally {
    // 冷却 3 秒，防连点刷屏
    setTimeout(() => (poking.value = false), 3000)
  }
}

const { lock } = usePassphrase()
async function leave() {
  await lock()
  if (import.meta.client) location.href = '/'
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
        <!-- 特殊日子徽章（点击重放彩蛋） -->
        <button
          v-if="celebration"
          class="mt-2 inline-flex items-center gap-1 rounded-full border border-rose-400/30 bg-rose-500/10 px-2.5 py-1 text-[11px] font-medium text-rose-200 transition hover:bg-rose-500/20 active:scale-95"
          title="再放一次"
          @click="replayCelebration"
        >
          <span>{{ celebration.emoji }}</span>
          <span>{{ celebration.title }}</span>
        </button>
      </div>
      <button class="text-slate-500 transition hover:text-slate-300" title="上锁离开" @click="leave">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" class="h-4 w-4">
          <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9" stroke-linecap="round" stroke-linejoin="round" />
        </svg>
      </button>
    </div>

    <div class="relative my-8">
      <p class="text-[11px] tracking-[0.3em] text-slate-400">在一起</p>
      <div class="mt-2 flex items-baseline gap-2">
        <span class="text-6xl font-extralight tabular-nums text-gradient">{{ dur.days }}</span>
        <span class="text-lg font-light text-slate-400">天</span>
      </div>
      <!-- 实时跳动的时:分:秒 -->
      <div class="mt-3 flex items-baseline gap-1.5 font-light tabular-nums text-slate-300">
        <span class="text-2xl">{{ pad(dur.hours) }}</span>
        <span class="text-sm text-slate-500">时</span>
        <span class="text-2xl">{{ pad(dur.minutes) }}</span>
        <span class="text-sm text-slate-500">分</span>
        <span class="text-2xl text-sky-300">{{ pad(dur.seconds) }}</span>
        <span class="text-sm text-slate-500">秒</span>
      </div>
      <p class="mt-3 text-xs tracking-wide text-slate-500">
        始于 {{ formatDate(siteConfig.startDate) }}
      </p>

      <!-- 想你了（小巧，时间区右下角） -->
      <button
        class="group absolute bottom-0 right-0 flex items-center gap-1 rounded-full border border-rose-400/30 bg-rose-500/10 px-2.5 py-1 text-[11px] font-medium text-rose-200 transition hover:border-rose-400/60 hover:bg-rose-500/20 active:scale-95 disabled:opacity-60"
        :disabled="poking"
        :title="`想 ${nameOf(partnerOf(identityKey)) || 'TA'} 了`"
        @click="poke"
      >
        <span class="transition group-hover:scale-125" :class="poking ? 'animate-ping-once' : ''">💗</span>
        <span v-if="justPoked">已送达～</span>
        <span v-else-if="poking">送达中</span>
        <span v-else>想 {{ nameOf(partnerOf(identityKey)) || 'TA' }} 了</span>
      </button>
    </div>

    <div class="border-t border-white/10 pt-3 text-xs tracking-wide text-slate-400">
      <span v-if="anniv.daysLeft > 0">距 {{ anniv.label }} · {{ anniv.daysLeft }} 天</span>
      <span v-else class="text-sky-300">🎉 今天就是 {{ anniv.label }} 纪念日！</span>
    </div>
  </div>
</template>
