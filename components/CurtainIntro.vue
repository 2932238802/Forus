<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { siteConfig } from '~/data/site'
import { usePassphrase } from '~/composables/usePassphrase'

const emit = defineEmits<{ opened: [] }>()
const { unlocked, tryUnlock } = usePassphrase()

const canvasRef = ref<HTMLCanvasElement | null>(null)
const entering = ref(false) // 点了狮子，正在进入
const askPass = ref(false)
const gone = ref(false)
const pass = ref('')
const wrong = ref(false)

let ctx: CanvasRenderingContext2D | null = null
let raf = 0
let W = 0
let H = 0
let dpr = 1

interface Ripple {
  x: number
  y: number
  r: number
  maxR: number
  speed: number
  alpha: number
  big: boolean
}
const ripples: Ripple[] = []

function rgb(varName: string, fallback: string) {
  if (import.meta.client) {
    const v = getComputedStyle(document.documentElement).getPropertyValue(varName).trim()
    return v || fallback
  }
  return fallback
}

function resize() {
  const c = canvasRef.value!
  W = window.innerWidth
  H = window.innerHeight
  dpr = Math.min(window.devicePixelRatio || 1, 2)
  c.width = W * dpr
  c.height = H * dpr
  c.style.width = W + 'px'
  c.style.height = H + 'px'
  ctx!.setTransform(dpr, 0, 0, dpr, 0, 0)
}

let t = 0
function draw() {
  if (!ctx) return
  t++
  ctx.clearRect(0, 0, W, H)

  // 湖面缓慢波光（几条横向正弦微光）
  const accent = rgb('--accent-rgb', '56,189,248')
  for (let i = 0; i < 5; i++) {
    const y = H * (0.55 + i * 0.09) + Math.sin(t * 0.01 + i) * 6
    ctx.beginPath()
    ctx.moveTo(0, y)
    for (let x = 0; x <= W; x += 20) {
      ctx.lineTo(x, y + Math.sin(x * 0.01 + t * 0.02 + i) * 4)
    }
    ctx.strokeStyle = `rgba(${accent},${0.04 + i * 0.01})`
    ctx.lineWidth = 1
    ctx.stroke()
  }

  // 涟漪
  for (const rp of ripples) {
    rp.r += rp.speed
    rp.alpha = Math.max(0, 1 - rp.r / rp.maxR)
    // 多重同心圆，更像水波
    for (let k = 0; k < (rp.big ? 3 : 2); k++) {
      const rr = rp.r - k * 18
      if (rr <= 0) continue
      ctx.beginPath()
      ctx.arc(rp.x, rp.y, rr, 0, Math.PI * 2)
      ctx.strokeStyle = `rgba(${accent},${rp.alpha * (0.5 - k * 0.12)})`
      ctx.lineWidth = rp.big ? 2 : 1.2
      ctx.stroke()
    }
  }
  for (let i = ripples.length - 1; i >= 0; i--) {
    if (ripples[i].r >= ripples[i].maxR) ripples.splice(i, 1)
  }

  raf = requestAnimationFrame(draw)
}

// 点湖面空白：小涟漪
function onPond(e: MouseEvent) {
  if (entering.value) return
  ripples.push({
    x: e.clientX,
    y: e.clientY,
    r: 0,
    maxR: 180,
    speed: 3,
    alpha: 1,
    big: false,
  })
}

// 点狮子：大涟漪 + 进入
function onLion(e: MouseEvent) {
  e.stopPropagation()
  if (entering.value) return
  entering.value = true
  ripples.push({
    x: e.clientX,
    y: e.clientY,
    r: 0,
    maxR: Math.max(W, H) * 1.3,
    speed: 16,
    alpha: 1,
    big: true,
  })
  // 大涟漪扩散后进入
  setTimeout(() => {
    if (unlocked.value) finish()
    else askPass.value = true
  }, 1100)
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

function onResize() {
  resize()
}

onMounted(() => {
  ctx = canvasRef.value!.getContext('2d')
  resize()
  raf = requestAnimationFrame(draw)
  window.addEventListener('resize', onResize)
})
onUnmounted(() => {
  cancelAnimationFrame(raf)
  window.removeEventListener('resize', onResize)
})
</script>

<template>
  <div v-if="!gone" class="fixed inset-0 z-[100] overflow-hidden">
    <!-- 湖面背景（暗色 + 主题色） -->
    <div class="lake-bg absolute inset-0" />

    <!-- 涟漪画布（点空白处产生小涟漪） -->
    <canvas ref="canvasRef" class="absolute inset-0 h-full w-full cursor-pointer" @click="onPond" />

    <!-- 中央内容 -->
    <div
      class="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center transition-opacity duration-700"
      :class="entering ? 'opacity-0' : 'opacity-100'"
    >
      <!-- 小狮子（可点击） -->
      <button
        class="pointer-events-auto select-none text-7xl transition-transform duration-300 hover:scale-110 active:scale-95 sm:text-8xl"
        style="animation: lionFloat 4s ease-in-out infinite"
        title="点我进入"
        @click="onLion"
      >
        🦁
      </button>

      <h1 class="mt-8 px-6 text-2xl font-light tracking-[0.15em] text-slate-100 sm:text-3xl">
        {{ siteConfig.curtainGreeting }}
      </h1>
      <div class="mt-6 h-px w-12 bg-white/30" />
      <p class="mt-5 text-xs font-light tracking-[0.25em] text-slate-400">
        轻触小狮子，泛起涟漪
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
          class="w-56 rounded-xl border border-white/15 bg-white/10 px-4 py-3 text-center text-sm tracking-widest text-white outline-none focus:border-white/40"
          :class="wrong ? 'border-rose-400' : ''"
        />
        <button
          type="submit"
          class="accent-bg mt-3 rounded-xl px-8 py-2.5 text-sm font-medium text-white transition hover:opacity-90 active:scale-95"
        >
          进入
        </button>
        <p v-if="wrong" class="mt-3 text-xs text-rose-400">暗号不对哦</p>
      </form>
    </div>
  </div>
</template>

<style scoped>
.lake-bg {
  background:
    radial-gradient(ellipse 90% 50% at 50% 100%, rgba(var(--glow-a), 0.22) 0%, transparent 60%),
    radial-gradient(ellipse 70% 40% at 50% 30%, rgba(var(--glow-b), 0.1) 0%, transparent 60%),
    linear-gradient(180deg, var(--bg-3) 0%, var(--bg-1) 60%, var(--bg-2) 100%);
}
@keyframes lionFloat {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-10px); }
}
</style>
