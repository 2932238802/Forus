<script setup lang="ts">
import { ref } from 'vue'

const links = [
  { to: '/', label: 'Home', emoji: '🏠' },
  { to: '/memo', label: '不能忘的事', emoji: '📝' },
  { to: '/goals', label: '!TARGET!', emoji: '🎯' },
  { to: '/likes', label: 'Like And Unlike', emoji: '💗' },
]

const open = ref(false)
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
        <span class="text-base">{{ l.emoji }}</span>
        <span class="whitespace-nowrap">{{ l.label }}</span>
      </NuxtLink>
    </transition-group>

    <!-- 浮动主按钮 -->
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
