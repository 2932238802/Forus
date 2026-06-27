<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'

const canvasRef = ref<HTMLCanvasElement | null>(null)
let ctx: CanvasRenderingContext2D | null = null
let raf = 0
let W = 0
let H = 0
let dpr = 1
let t = 0

interface Petal {
  x: number
  y: number
  size: number
  speedY: number
  swing: number // 摆动幅度
  swingSpeed: number
  phase: number
  rot: number
  vr: number
  color: string
  opacity: number
}

// 鼠标拖尾花瓣
interface Trail {
  x: number; y: number; vx: number; vy: number
  size: number; rot: number; vr: number
  life: number; maxLife: number; color: string
}

const petals: Petal[] = []
const trails: Trail[] = []
// 樱花粉色系
const COLORS = ['#ffd1e3', '#ffb7d5', '#fb7faf', '#ffc6dd', '#ff9ec4']

function rand(a: number, b: number) {
  return a + Math.random() * (b - a)
}

function makePetal(initial = false): Petal {
  return {
    x: rand(0, W),
    y: initial ? rand(-H, H) : rand(-40, -10),
    size: rand(8, 16),
    speedY: rand(0.6, 1.6),
    swing: rand(20, 60),
    swingSpeed: rand(0.005, 0.02),
    phase: rand(0, Math.PI * 2),
    rot: rand(0, Math.PI * 2),
    vr: rand(-0.02, 0.02),
    color: COLORS[Math.floor(Math.random() * COLORS.length)],
    opacity: rand(0.6, 1),
  }
}

function buildPetals() {
  petals.length = 0
  const count = Math.min(70, Math.floor((W * H) / 24000))
  for (let i = 0; i < count; i++) petals.push(makePetal(true))
}

// 鼠标移动：在光标处撒出小花瓣，按移动速度生成数量
let lastX = 0
let lastY = 0
function onMouseMove(e: MouseEvent) {
  const dx = e.clientX - lastX
  const dy = e.clientY - lastY
  lastX = e.clientX
  lastY = e.clientY
  const speed = Math.hypot(dx, dy)
  const n = Math.min(3, Math.floor(speed / 10))
  for (let i = 0; i < n; i++) {
    trails.push({
      x: e.clientX + rand(-4, 4),
      y: e.clientY + rand(-4, 4),
      vx: dx * 0.04 + rand(-0.6, 0.6),
      vy: dy * 0.04 + rand(0.2, 1.2),
      size: rand(5, 10),
      rot: rand(0, Math.PI * 2),
      vr: rand(-0.1, 0.1),
      life: 0,
      maxLife: rand(40, 70),
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
    })
  }
}

function setup() {
  const canvas = canvasRef.value!
  ctx = canvas.getContext('2d')
  dpr = Math.min(window.devicePixelRatio || 1, 2)
  resize()
  buildPetals()
}

function resize() {
  const canvas = canvasRef.value!
  W = window.innerWidth
  H = window.innerHeight
  canvas.width = W * dpr
  canvas.height = H * dpr
  canvas.style.width = W + 'px'
  canvas.style.height = H + 'px'
  ctx!.setTransform(dpr, 0, 0, dpr, 0, 0)
  buildPetals()
}

// 画一片樱花花瓣（带小缺口的椭圆瓣）
function drawPetal(p: Petal) {
  ctx!.save()
  ctx!.translate(p.x, p.y)
  ctx!.rotate(p.rot)
  ctx!.globalAlpha = p.opacity
  ctx!.fillStyle = p.color
  const s = p.size
  ctx!.beginPath()
  ctx!.moveTo(0, 0)
  ctx!.bezierCurveTo(s * 0.3, -s * 0.5, s * 0.7, -s * 0.5, s, 0)
  ctx!.bezierCurveTo(s * 0.7, s * 0.2, s * 0.4, s * 0.4, s * 0.5, s)
  ctx!.bezierCurveTo(s * 0.3, s * 0.5, s * 0.1, s * 0.3, 0, 0)
  ctx!.fill()
  ctx!.restore()
}

function draw() {
  if (!ctx) return
  t++
  ctx.clearRect(0, 0, W, H)
  for (const p of petals) {
    p.y += p.speedY
    p.x += Math.sin(t * p.swingSpeed + p.phase) * 0.6
    p.rot += p.vr
    drawPetal(p)
    // 落到底部或飘出左右 → 重置到顶部
    if (p.y > H + 30 || p.x < -40 || p.x > W + 40) {
      Object.assign(p, makePetal(false))
    }
  }
  // 鼠标拖尾花瓣
  for (const tr of trails) {
    tr.vy += 0.04 // 轻微重力
    tr.vx *= 0.97
    tr.x += tr.vx
    tr.y += tr.vy
    tr.rot += tr.vr
    tr.life++
    const a = Math.max(0, 1 - tr.life / tr.maxLife)
    ctx.save()
    ctx.translate(tr.x, tr.y)
    ctx.rotate(tr.rot)
    ctx.globalAlpha = a
    ctx.fillStyle = tr.color
    const s = tr.size
    ctx.beginPath()
    ctx.moveTo(0, 0)
    ctx.bezierCurveTo(s * 0.3, -s * 0.5, s * 0.7, -s * 0.5, s, 0)
    ctx.bezierCurveTo(s * 0.7, s * 0.2, s * 0.4, s * 0.4, s * 0.5, s)
    ctx.bezierCurveTo(s * 0.3, s * 0.5, s * 0.1, s * 0.3, 0, 0)
    ctx.fill()
    ctx.restore()
  }
  for (let i = trails.length - 1; i >= 0; i--) {
    if (trails[i].life >= trails[i].maxLife) trails.splice(i, 1)
  }
  raf = requestAnimationFrame(draw)
}

function onResize() {
  resize()
}
function onVisibility() {
  if (document.hidden) {
    if (raf) { cancelAnimationFrame(raf); raf = 0 }
  } else if (!raf) {
    raf = requestAnimationFrame(draw)
  }
}

onMounted(() => {
  const reduceMotion =
    typeof window !== 'undefined' &&
    window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches

  setup()
  if (reduceMotion) {
    // 只画静态一帧
    for (const p of petals) drawPetal(p)
    window.addEventListener('resize', onResize)
    return
  }
  raf = requestAnimationFrame(draw)
  window.addEventListener('resize', onResize)
  document.addEventListener('visibilitychange', onVisibility)
  window.addEventListener('mousemove', onMouseMove)
})
onUnmounted(() => {
  if (raf) cancelAnimationFrame(raf)
  window.removeEventListener('resize', onResize)
  document.removeEventListener('visibilitychange', onVisibility)
  window.removeEventListener('mousemove', onMouseMove)
})
</script>

<template>
  <canvas ref="canvasRef" class="pointer-events-none fixed inset-0 h-full w-full" />
</template>
