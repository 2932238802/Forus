<script setup lang="ts">
import { ref } from 'vue'
import { useTheme } from '~/composables/useTheme'

const { current, themes, apply } = useTheme()
const open = ref(false)
</script>

<template>
  <div class="fixed bottom-4 right-4 z-50">
    <!-- 展开的色板 -->
    <transition name="fade">
      <div
        v-if="open"
        class="mb-3 flex flex-col gap-2 rounded-2xl border border-white/10 bg-black/40 p-3 backdrop-blur-md"
      >
        <button
          v-for="t in themes"
          :key="t.id"
          class="flex items-center gap-2.5 rounded-lg px-2 py-1.5 text-left text-xs transition hover:bg-white/10"
          :class="current === t.id ? 'bg-white/10' : ''"
          @click="apply(t.id)"
        >
          <span
            class="h-4 w-4 shrink-0 rounded-full ring-2 ring-white/20"
            :style="{ background: t.swatch }"
          />
          <span class="text-slate-200">{{ t.name }}</span>
          <svg
            v-if="current === t.id"
            viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"
            class="ml-auto h-3.5 w-3.5 text-slate-300"
          >
            <path d="M5 13l4 4L19 7" stroke-linecap="round" stroke-linejoin="round" />
          </svg>
        </button>
      </div>
    </transition>

    <!-- 触发按钮 -->
    <button
      class="flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-black/40 text-slate-200 backdrop-blur-md transition hover:scale-105"
      title="切换主题"
      @click="open = !open"
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" class="h-5 w-5">
        <circle cx="12" cy="12" r="9" />
        <path d="M12 3a9 9 0 000 18c1.5 0 2-1 2-2s-.5-1.5-.5-2.5.5-1.5 1.5-1.5h1.5A3.5 3.5 0 0021 11.5 8.5 8.5 0 0012 3z" />
        <circle cx="8" cy="10" r="1" fill="currentColor" stroke="none" />
        <circle cx="12" cy="8" r="1" fill="currentColor" stroke="none" />
        <circle cx="16" cy="10" r="1" fill="currentColor" stroke="none" />
      </svg>
    </button>
  </div>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: all 0.25s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
  transform: translateY(8px);
}
</style>
