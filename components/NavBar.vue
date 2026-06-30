<script setup lang="ts">
import { ref } from 'vue'
import { usePassphrase } from '~/composables/usePassphrase'

const links = [
  { to: '/', label: 'Home' },
  { to: '/memo', label: '不能忘的事' },
  { to: '/goals', label: '!TARGET!' },
  { to: '/likes', label: 'Like And Unlike' },
  { to: '/letters', label: '给未来的信' },
  { to: '/calendar', label: 'Calendar' },
]

const open = ref(false)

const { lock } = usePassphrase()

async function onLock() {
  open.value = false
  await lock() // 服务端清除签名 Cookie
  if (import.meta.client) location.href = '/' // 回首页，重新显示封面
}
</script>

<template>
  <div class="fixed bottom-4 left-4 z-50">
    <!-- 展开的菜单（向上弹出） -->
    <transition-group
      name="pop"
      tag="div"
      class="mb-3 flex flex-col gap-2"
    >
      <NuxtLink
        v-for="(l, i) in (open ? links : [])"
        :key="l.to"
        :to="l.to"
        class="flex items-center gap-2.5 rounded-full border border-white/10 bg-black/50 px-4 py-2 text-sm text-slate-200 backdrop-blur-md transition hover:bg-white/10"
        active-class="accent-text"
        :style="{ transitionDelay: `${i * 40}ms` }"
        @click="open = false"
      >
        <span class="whitespace-nowrap">{{ l.label }}</span>
      </NuxtLink>

      <!-- 锁定（清除本设备解锁状态，回到封面） -->
      <button
        v-for="x in (open ? [1] : [])"
        :key="'lock'"
        type="button"
        class="flex items-center gap-2.5 rounded-full border border-white/10 bg-black/50 px-4 py-2 text-sm text-slate-400 backdrop-blur-md transition hover:bg-rose-500/20 hover:text-rose-300"
        :style="{ transitionDelay: `${links.length * 40}ms` }"
        @click="onLock"
      >
        <span class="whitespace-nowrap">🔒 锁定</span>
      </button>
    </transition-group>

    <!-- 浮动主按钮（可拖动） -->
    <button
      class="flex h-12 w-12 items-center justify-center rounded-full border border-white/10 bg-black/50 text-2xl backdrop-blur-md transition hover:scale-105 active:scale-95"
      :title="open ? '收起' : '去别处看看'"
      @click="open = !open"
    >
      <span class="transition-transform duration-300" :class="open ? 'rotate-45' : ''">
        {{ open ? '✕' : '🌙' }}
      </span>
    </button>
  </div>
</template>

<style scoped>
.pop-enter-active,
.pop-leave-active {
  transition: all 0.3s ease;
}
.pop-enter-from,
.pop-leave-to {
  opacity: 0;
  transform: translateY(12px) scale(0.9);
}
</style>
