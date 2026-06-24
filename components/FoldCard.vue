<script setup lang="ts">
import { ref } from 'vue'

const props = defineProps<{
  title: string
  defaultOpen?: boolean
  forceOpen?: boolean // PC 端强制展开、不可折叠
}>()

const open = ref(props.defaultOpen ?? false)
</script>

<template>
  <div class="flex h-full flex-col">
    <!-- 标题栏 -->
    <button
      class="flex shrink-0 items-center justify-between text-left"
      :class="forceOpen ? 'cursor-default' : ''"
      @click="!forceOpen && (open = !open)"
    >
      <h2 class="text-sm font-medium tracking-wide text-slate-300">{{ title }}</h2>
      <span class="flex items-center gap-2">
        <slot name="action" />
        <svg
          v-if="!forceOpen"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          class="h-4 w-4 text-slate-500 transition-transform duration-300"
          :class="open ? 'rotate-180' : ''"
        >
          <path d="M6 9l6 6 6-6" stroke-linecap="round" stroke-linejoin="round" />
        </svg>
      </span>
    </button>

    <!-- 内容 -->
    <div v-show="forceOpen || open" class="mt-3 flex min-h-0 flex-1 flex-col">
      <slot />
    </div>
  </div>
</template>
