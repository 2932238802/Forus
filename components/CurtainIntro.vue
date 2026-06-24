<script setup lang="ts">
import { ref } from 'vue'
import { siteConfig } from '~/data/site'
import { usePassphrase } from '~/composables/usePassphrase'

const emit = defineEmits<{ opened: [] }>()
const { unlocked, tryUnlock } = usePassphrase()

const entering = ref(false)
const askPass = ref(false)
const gone = ref(false)
const pass = ref('')
const wrong = ref(false)

function onEnter() {
  if (entering.value || askPass.value) return
  entering.value = true
  setTimeout(() => {
    if (unlocked.value) finish()
    else askPass.value = true
  }, 700)
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
  <div v-if="!gone" class="fixed inset-0 z-[100] overflow-hidden">
    <!-- 流星夜空背景（与主界面统一） -->
    <div class="absolute inset-0 night-bg" />
    <ClientOnly>
      <MeteorCanvas :interactive="true" />
    </ClientOnly>

    <!-- 中央内容（点击进入） -->
    <div
      class="absolute inset-0 flex cursor-pointer flex-col items-center justify-center text-center transition-opacity duration-700"
      :class="entering ? 'pointer-events-none opacity-0' : 'opacity-100'"
      @click="onEnter"
    >
      <h1 class="px-6 text-2xl font-light tracking-[0.15em] text-slate-100 drop-shadow sm:text-4xl">
        {{ siteConfig.curtainGreeting }}
      </h1>
      <div class="mt-8 h-px w-12 bg-white/30" />
      <p class="mt-6 text-xs font-light tracking-[0.25em] text-slate-400">
        轻触夜空，划过星河
      </p>
    </div>

    <!-- 暗号输入 -->
    <div
      v-if="askPass"
      class="absolute inset-0 z-10 flex flex-col items-center justify-center bg-black/30 text-center backdrop-blur-sm"
    >
      <p class="text-xs font-light tracking-[0.25em] text-slate-300">我们的暗号</p>
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
