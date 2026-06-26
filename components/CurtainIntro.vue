<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { siteConfig } from '~/data/site'
import { usePassphrase } from '~/composables/usePassphrase'
import { useIdentity, type IdentityKey } from '~/composables/useIdentity'

const emit = defineEmits<{ opened: [] }>()
const { unlocked, tryUnlock } = usePassphrase()
const { identityKey, identities, load: loadIdentity, choose } = useIdentity()

const entering = ref(false)
const askPass = ref(false)
const askWho = ref(false) // 选身份环节
const gone = ref(false)
const pass = ref('')
const wrong = ref(false)
const submitting = ref(false)

onMounted(() => {
  loadIdentity() // 读本设备已选身份
})

function onEnter() {
  if (entering.value || askPass.value || askWho.value) return
  entering.value = true
  setTimeout(() => {
    if (unlocked.value) afterUnlock()
    else askPass.value = true
  }, 700)
}

// 暗号通过后：若本设备已选过身份直接进，否则先选身份
function afterUnlock() {
  askPass.value = false
  if (identityKey.value) {
    finish()
  } else {
    askWho.value = true
  }
}

function pickWho(key: IdentityKey) {
  choose(key)
  askWho.value = false
  finish()
}

function finish() {
  emit('opened')
  setTimeout(() => {
    gone.value = true
  }, 700)
}

async function submit() {
  if (submitting.value) return
  submitting.value = true
  const ok = await tryUnlock(pass.value)
  submitting.value = false
  if (ok) {
    wrong.value = false
    afterUnlock()
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
        我是 LosAngelous
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
          :disabled="submitting"
          class="accent-bg mt-3 rounded-xl px-8 py-2.5 text-sm font-medium text-white transition hover:opacity-90 active:scale-95 disabled:opacity-50"
        >
          {{ submitting ? '验证中…' : '进入' }}
        </button>
        <p v-if="wrong" class="mt-3 text-xs text-rose-300">暗号不对哦</p>
      </form>
    </div>

    <!-- 选身份 -->
    <div
      v-if="askWho"
      class="absolute inset-0 z-10 flex flex-col items-center justify-center bg-black/40 text-center backdrop-blur-sm"
    >
      <p class="text-xs font-light tracking-[0.25em] text-slate-300">你是…</p>
      <div class="mt-6 flex gap-4">
        <button
          v-for="who in identities"
          :key="who.key"
          type="button"
          class="group flex min-w-[120px] flex-col items-center gap-2 rounded-2xl border px-6 py-5 transition active:scale-95"
          :class="who.key === 'npy'
            ? 'border-sky-400/60 bg-sky-500/10 ring-1 ring-sky-400/40 hover:bg-sky-500/20'
            : 'border-white/15 bg-white/5 hover:border-white/40 hover:bg-white/10'"
          @click="pickWho(who.key)"
        >
          <span class="text-2xl transition group-hover:scale-110">{{ who.key === 'you' ? '🌙' : '⭐' }}</span>
          <span class="text-sm font-medium tracking-wide text-slate-100">{{ who.name }}</span>
          <span v-if="who.key === 'npy'" class="text-[10px] tracking-wide text-sky-300/80">默认</span>
        </button>
      </div>
      <p class="mt-6 text-[11px] tracking-wide text-slate-500">这台设备会记住你的选择</p>
    </div>
  </div>
</template>
