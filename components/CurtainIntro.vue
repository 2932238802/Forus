<script setup lang="ts">
import { ref } from 'vue'
import { siteConfig } from '~/data/site'
import { usePassphrase } from '~/composables/usePassphrase'

const emit = defineEmits<{ opened: [] }>()

const { unlocked, tryUnlock } = usePassphrase()

const opening = ref(false)   // 窗帘是否正在拉开
const askPass = ref(false)   // 是否显示暗号输入
const gone = ref(false)      // 封面是否完全移除
const pass = ref('')
const wrong = ref(false)

function open() {
  if (opening.value) return
  opening.value = true
  // 拉开窗帘后
  setTimeout(() => {
    if (unlocked.value) {
      // 已记住暗号，直接进入
      finish()
    } else {
      // 显示暗号输入
      askPass.value = true
    }
  }, 1300)
}

function finish() {
  emit('opened')
  setTimeout(() => {
    gone.value = true
  }, 800)
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
    <!-- 阳光层（窗帘后面） -->
    <div class="absolute inset-0 bg-gradient-to-b from-white via-mist to-white">
      <div v-if="opening" class="sunbeam pointer-events-none absolute inset-0" />
      <div v-if="opening" class="sun-rays pointer-events-none absolute right-0 top-0 h-[120vh] w-[120vw]" />
      <template v-if="opening">
        <span
          v-for="i in 10"
          :key="i"
          class="dust pointer-events-none absolute rounded-full bg-amber-100/60 blur-[1px]"
          :style="{
            top: `${10 + ((i * 7) % 70)}%`,
            right: `${5 + ((i * 11) % 55)}%`,
            width: `${4 + (i % 3) * 3}px`,
            height: `${4 + (i % 3) * 3}px`,
            animationDelay: `${i * 0.3}s`,
          }"
        />
      </template>
    </div>

    <!-- 暗号输入（窗帘拉开后浮现） -->
    <div
      v-if="askPass"
      class="absolute inset-0 z-10 flex flex-col items-center justify-center text-center"
    >
      <p class="text-xs font-light tracking-[0.25em] text-slate-400">我们的暗号</p>
      <form class="mt-5 flex flex-col items-center" @submit.prevent="submit">
        <input
          v-model="pass"
          type="password"
          autofocus
          class="w-56 rounded-xl border border-slate-200 bg-white/70 px-4 py-3 text-center text-sm tracking-widest outline-none focus:border-sky"
          :class="wrong ? 'border-rose-300' : ''"
        />
        <button
          type="submit"
          class="mt-3 rounded-xl bg-sky px-8 py-2.5 text-sm font-medium text-white transition hover:bg-sky-deep active:scale-95"
        >
          进入
        </button>
        <p v-if="wrong" class="mt-3 text-xs text-rose-400">暗号不对哦</p>
      </form>
    </div>

    <!-- 左半窗帘 -->
    <div
      class="curtain-soft absolute left-0 top-0 h-full w-1/2 transition-transform duration-[1900ms] ease-[cubic-bezier(0.65,0,0.2,1)]"
      :class="opening ? '-translate-x-full' : 'translate-x-0'"
    >
      <div class="absolute right-0 top-0 h-full w-16 bg-gradient-to-l from-slate-300/30 to-transparent" />
    </div>

    <!-- 右半窗帘 -->
    <div
      class="curtain-soft absolute right-0 top-0 h-full w-1/2 transition-transform duration-[1900ms] ease-[cubic-bezier(0.65,0,0.2,1)]"
      :class="opening ? 'translate-x-full' : 'translate-x-0'"
    >
      <div class="absolute left-0 top-0 h-full w-16 bg-gradient-to-r from-slate-300/30 to-transparent" />
    </div>

    <!-- 中缝细光线 -->
    <div
      class="absolute left-1/2 top-0 h-full w-px -translate-x-1/2 bg-white/50 transition-opacity duration-700"
      :class="opening ? 'opacity-0' : 'opacity-100'"
    />

    <!-- 封面文案（点击触发拉开） -->
    <div
      class="absolute inset-0 flex cursor-pointer flex-col items-center justify-center text-center transition-opacity duration-700"
      :class="opening ? 'pointer-events-none opacity-0' : 'opacity-100'"
      @click="open"
    >
      <h1 class="px-6 text-2xl font-light tracking-[0.15em] text-slate-600 sm:text-4xl">
        {{ siteConfig.curtainGreeting }}
      </h1>
      <div class="mt-8 h-px w-12 bg-slate-300" />
      <p class="mt-6 text-xs font-light tracking-[0.25em] text-slate-400">
        {{ siteConfig.curtainHint }}
      </p>
    </div>
  </div>
</template>
