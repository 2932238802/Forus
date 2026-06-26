<script setup lang="ts">
import type { NuxtError } from '#app'

const props = defineProps<{ error: NuxtError }>()

const is404 = props.error?.statusCode === 404

function goHome() {
  clearError({ redirect: '/' })
}
</script>

<template>
  <div class="night-bg relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-6 text-center">
    <ClientOnly>
      <MeteorCanvas :interactive="false" />
    </ClientOnly>

    <div class="relative z-10">
      <p class="text-6xl font-extralight tracking-widest text-slate-200">
        {{ error?.statusCode || '错误' }}
      </p>
      <p class="mt-4 text-sm tracking-[0.2em] text-slate-400">
        {{ is404 ? '这里什么都没有哦～' : '出了点小问题' }}
      </p>
      <button
        class="accent-bg mt-8 rounded-xl px-8 py-2.5 text-sm font-medium text-white transition hover:opacity-90 active:scale-95"
        @click="goHome"
      >
        回家
      </button>
    </div>
  </div>
</template>
