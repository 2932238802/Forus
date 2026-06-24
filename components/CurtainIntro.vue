<script setup lang="ts">
import { ref } from 'vue'
import { siteConfig } from '~/data/site'
import { usePassphrase } from '~/composables/usePassphrase'

const emit = defineEmits<{ opened: [] }>()
const { unlocked, tryUnlock } = usePassphrase()

const waterRef = ref<any>(null)
const entering = ref(false)
const askPass = ref(false)
const gone = ref(false)
const pass = ref('')
const wrong = ref(false)

function onLion(e: MouseEvent) {
  e.stopPropagation()
  if (entering.value) return
  entering.value = true
  // 在狮子位置打一个大水波
  if (waterRef.value?.bigDrop) waterRef.value.bigDrop(e.clientX, e.clientY)
  setTimeout(() => {
    if (unlocked.value) finish()
    else askPass.value = true
  }, 1300)
}

function finish() {
  emit('opened')
  setTimeout(() => {
    gone.value = true
  }, 700)
}

function submit() {
  if (tryUnlock(pass.value)) {
    wrong.value = false
    askPass.value = false
    finish()
  } else {
    wrong.value = true
    pass.value = ''
  }
}
</script>

<template>
  <div v-if="!gone" class="fixed inset-0 z-[100] overflow-hidden bg-black">
    <!-- 真实水面（WebGL，点击产生水波） -->
    <ClientOnly>
      <WaterRipple ref="waterRef" src="/lake.jpg" />
    </ClientOnly>

    <!-- 轻微暗化让文字可读 -->
    <div class="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-black/40" />

    <!-- 中央内容 -->
    <div
      class="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center transition-opacity duration-700"
      :class="entering ? 'opacity-0' : 'opacity-100'"
    >
      <button
        class="pointer-events-auto select-none text-7xl drop-shadow-[0_4px_20px_rgba(0,0,0,0.5)] transition-transform duration-300 hover:scale-110 active:scale-95 sm:text-8xl"
        style="animation: lionFloat 4s ease-in-out infinite"
        title="点我进入"
        @click="onLion"
      >
        🦁
      </button>

      <h1 class="mt-8 px-6 text-2xl font-light tracking-[0.15em] text-white drop-shadow-[0_2px_12px_rgba(0,0,0,0.7)] sm:text-3xl">
        {{ siteConfig.curtainGreeting }}
      </h1>
      <div class="mt-6 h-px w-12 bg-white/40" />
      <p class="mt-5 text-xs font-light tracking-[0.25em] text-white/70 drop-shadow">
        轻触小狮子，泛起涟漪
      </p>
    </div>

    <!-- 暗号输入 -->
    <div
      v-if="askPass"
      class="absolute inset-0 z-10 flex flex-col items-center justify-center bg-black/40 text-center backdrop-blur-sm"
    >
      <p class="text-xs font-light tracking-[0.25em] text-white/80">我们的暗号</p>
      <form class="mt-5 flex flex-col items-center" @submit.prevent="submit">
        <input
          v-model="pass"
          type="password"
          autofocus
          class="w-56 rounded-xl border border-white/20 bg-white/10 px-4 py-3 text-center text-sm tracking-widest text-white outline-none focus:border-white/50"
          :class="wrong ? 'border-rose-400' : ''"
        />
        <button
          type="submit"
          class="accent-bg mt-3 rounded-xl px-8 py-2.5 text-sm font-medium text-white transition hover:opacity-90 active:scale-95"
        >
          进入
        </button>
        <p v-if="wrong" class="mt-3 text-xs text-rose-300">暗号不对哦</p>
      </form>
    </div>
  </div>
</template>

<style scoped>
@keyframes lionFloat {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-10px); }
}
</style>
