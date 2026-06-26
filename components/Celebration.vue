<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import type { Celebration } from '~/utils/date'

const props = defineProps<{ celebration: Celebration }>()
const emit = defineEmits<{ done: [] }>()

const canvasRef = ref<HTMLCanvasElement | null>(null)
const showText = ref(false)
const fading = ref(false)
let raf = 0
let ctx: CanvasRenderingContext2D | null = null
let W = 0
let H = 0
let dpr = 1
let startTime = 0

interface Confetti {
  x: number; y: number; vx: number; vy: number
  size: number; color: string; rot: number; vr: number; shape: 'rect' | 'circ'
}
const pieces: Confetti[] = []

// 喜庆配色
const COLORS = ['#fb7185', '#f472b6', '#fbbf24', '#34d399', '#38bdf8', '#a78bfa', '#fde68a', '#fff']

function rand(a: number, b: number) {
  return a + Math.random() * (b - a)
}

// 从底部两侧 + 顶部撒下彩带
function burst() {
  // 顶部飘落
  for (let i = 0; i < 120; i++) {
    pieces.push({
      x: rand(0, W),
      y: rand(-H * 0.3, 0),
      vx: rand(-0.6, 0.6),
      vy: rand(1.5, 4),
      size: rand(6, 12),
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      rot: rand(0, Math.PI * 2),
      vr: rand(-0.2, 0.2),
      shape: Math.random() > 0.5 ? 'rect' : 'circ',
    })
  }
  // 底部两侧礼花喷射
  const cannons = [
    { x: W * 0.1, y: H, ang: -Math.PI / 3 },
    { x: W * 0.9, y: H, ang: -Math.PI * 2 / 3 },
  ]
  for (const c of cannons) {
    for (let i = 0; i < 80; i++) {
      const a = c.ang + rand(-0.4, 0.4)
      const sp = rand(8, 18)
      pieces.push({
        x: c.x,
        y: c.y,
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp,
        size: rand(6, 12),
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
        rot: rand(0, Math.PI * 2),
        vr: rand(-0.3, 0.3),
        shape: Math.random() > 0.5 ? 'rect' : 'circ',
      })
    }
  }
}

function resize() {
  const canvas = canvasRef.value!
  W = window.innerWidth
  H = window.innerHeight
  dpr = Math.min(window.devicePixelRatio || 1, 2)
  canvas.width = W * dpr
  canvas.height = H * dpr
  canvas.style.width = W + 'px'
  canvas.style.height = H + 'px'
  ctx!.setTransform(dpr, 0, 0, dpr, 0, 0)
}

function draw(ts: number) {
  if (!ctx) return
  if (!startTime) startTime = ts
  const elapsed = ts - startTime

  ctx.clearRect(0, 0, W, H)
  for (const p of pieces) {
    p.vy += 0.18 // 重力
    p.vx *= 0.99
    p.x += p.vx
    p.y += p.vy
    p.rot += p.vr
    ctx.save()
    ctx.translate(p.x, p.y)
    ctx.rotate(p.rot)
    ctx.fillStyle = p.color
    if (p.shape === 'rect') {
      ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6)
    } else {
      ctx.beginPath()
      ctx.arc(0, 0, p.size / 2, 0, Math.PI * 2)
      ctx.fill()
    }
    ctx.restore()
  }
  // 清掉飞出屏幕的
  for (let i = pieces.length - 1; i >= 0; i--) {
    if (pieces[i].y > H + 40) pieces.splice(i, 1)
  }

  // 二次补撒（更热闹）
  if (elapsed > 600 && elapsed < 660) burst()

  if (elapsed < 5000 && pieces.length > 0) {
    raf = requestAnimationFrame(draw)
  } else {
    finish()
  }
}

function finish() {
  if (fading.value) return
  fading.value = true
  setTimeout(() => emit('done'), 600)
}

function onResize() {
  resize()
}

onMounted(() => {
  const canvas = canvasRef.value!
  ctx = canvas.getContext('2d')
  resize()
  window.addEventListener('resize', onResize)
  burst()
  raf = requestAnimationFrame(draw)
  // 文字稍后浮现
  setTimeout(() => (showText.value = true), 300)
})

onUnmounted(() => {
  if (raf) cancelAnimationFrame(raf)
  window.removeEventListener('resize', onResize)
})
</script>

<template>
  <Teleport to="body">
    <div
      class="fixed inset-0 z-[400] flex items-center justify-center transition-opacity duration-500"
      :class="fading ? 'opacity-0' : 'opacity-100'"
      @click="finish"
    >
      <!-- 半透明压暗背景 -->
      <div class="absolute inset-0 bg-black/40 backdrop-blur-[2px]" />
      <!-- 彩带 canvas -->
      <canvas ref="canvasRef" class="pointer-events-none absolute inset-0" />

      <!-- 中央祝福文字 -->
      <div
        class="relative z-10 px-8 text-center transition-all duration-700"
        :class="showText ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'"
      >
        <div class="text-6xl drop-shadow-lg sm:text-7xl">{{ celebration.emoji }}</div>
        <h2 class="mt-5 text-2xl font-medium tracking-wide text-white drop-shadow sm:text-4xl">
          {{ celebration.title }}
        </h2>
        <p class="mt-3 text-sm tracking-[0.1em] text-white/80 sm:text-base">
          {{ celebration.subtitle }}
        </p>
        <p class="mt-10 text-[11px] tracking-widest text-white/40">轻触任意处继续</p>
      </div>
    </div>
  </Teleport>
</template>
