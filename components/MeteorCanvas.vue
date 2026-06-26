<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'

// interactive: 是否启用鼠标彗星尾（封面用 true，主界面背景用 false）
const props = withDefaults(defineProps<{ interactive?: boolean }>(), {
  interactive: false,
})

const canvasRef = ref<HTMLCanvasElement | null>(null)
let ctx: CanvasRenderingContext2D | null = null
let raf = 0
let W = 0
let H = 0
let dpr = 1

interface Star {
  x: number; y: number; r: number; base: number; twk: number; phase: number
}
interface Meteor {
  x: number; y: number; len: number; speed: number; size: number
  life: number; maxLife: number; active: boolean
}
// 鼠标拖尾粒子
interface Trail {
  x: number; y: number; vx: number; vy: number; life: number; maxLife: number; size: number
}

const stars: Star[] = []
const meteors: Meteor[] = []
const trails: Trail[] = []

const ANGLE = Math.PI * 0.78
const DIRX = Math.cos(ANGLE)
const DIRY = Math.sin(ANGLE)

function rand(min: number, max: number) {
  return min + Math.random() * (max - min)
}

function setup() {
  const canvas = canvasRef.value!
  ctx = canvas.getContext('2d')
  dpr = Math.min(window.devicePixelRatio || 1, 2)
  resize()
  buildStars()
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
  buildStars()
}

function buildStars() {
  stars.length = 0
  const count = Math.floor((W * H) / 6000)
  for (let i = 0; i < count; i++) {
    stars.push({
      x: Math.random() * W,
      y: Math.random() * H,
      r: rand(0.4, 1.4),
      base: rand(0.3, 0.8),
      twk: rand(0.2, 0.5),
      phase: Math.random() * Math.PI * 2,
    })
  }
}

function spawnMeteor() {
  meteors.push({
    x: rand(W * 0.3, W * 1.1),
    y: rand(-H * 0.1, H * 0.4),
    len: rand(140, 260),
    speed: rand(6, 11),
    size: rand(1.2, 2.2),
    life: 0,
    maxLife: rand(60, 110),
    active: true,
  })
}

// 鼠标移动：在鼠标处撒星尘
let lastX = 0
let lastY = 0
function onMouseMove(e: MouseEvent) {
  if (!props.interactive) return
  const dx = e.clientX - lastX
  const dy = e.clientY - lastY
  lastX = e.clientX
  lastY = e.clientY
  // 移动越快撒越多
  const n = Math.min(4, 1 + Math.floor(Math.hypot(dx, dy) / 8))
  for (let i = 0; i < n; i++) {
    trails.push({
      x: e.clientX + rand(-3, 3),
      y: e.clientY + rand(-3, 3),
      vx: dx * 0.05 + rand(-0.4, 0.4),
      vy: dy * 0.05 + rand(-0.4, 0.4),
      life: 0,
      maxLife: rand(28, 50),
      size: rand(1, 2.4),
    })
  }
}

let t = 0
let nextSpawn = 30
function draw() {
  if (!ctx) return
  t++
  ctx.clearRect(0, 0, W, H)

  // 星星
  for (const s of stars) {
    const a = s.base + Math.sin(t * 0.02 + s.phase) * s.twk
    ctx.beginPath()
    ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2)
    ctx.fillStyle = `rgba(255,255,255,${Math.max(0, Math.min(1, a))})`
    ctx.fill()
  }

  // 流星
  if (t >= nextSpawn) {
    spawnMeteor()
    nextSpawn = t + rand(70, 160)
  }
  for (const m of meteors) {
    if (!m.active) continue
    m.x += DIRX * m.speed
    m.y += DIRY * m.speed
    m.life++
    const p = m.life / m.maxLife
    let alpha = 1
    if (p < 0.15) alpha = p / 0.15
    else if (p > 0.7) alpha = Math.max(0, (1 - p) / 0.3)
    const tailX = m.x - DIRX * m.len
    const tailY = m.y - DIRY * m.len
    const grad = ctx.createLinearGradient(m.x, m.y, tailX, tailY)
    grad.addColorStop(0, `rgba(255,255,255,${0.9 * alpha})`)
    grad.addColorStop(0.3, `rgba(186,230,253,${0.5 * alpha})`)
    grad.addColorStop(1, 'rgba(125,211,252,0)')
    ctx.strokeStyle = grad
    ctx.lineWidth = m.size
    ctx.lineCap = 'round'
    ctx.beginPath()
    ctx.moveTo(m.x, m.y)
    ctx.lineTo(tailX, tailY)
    ctx.stroke()
    ctx.beginPath()
    ctx.arc(m.x, m.y, m.size * 1.1, 0, Math.PI * 2)
    ctx.fillStyle = `rgba(255,255,255,${alpha})`
    ctx.shadowColor = 'rgba(186,230,253,0.9)'
    ctx.shadowBlur = 8
    ctx.fill()
    ctx.shadowBlur = 0
    if (m.life >= m.maxLife || m.x < -m.len || m.y > H + m.len) m.active = false
  }
  for (let i = meteors.length - 1; i >= 0; i--) {
    if (!meteors[i].active) meteors.splice(i, 1)
  }

  // 鼠标彗星尾粒子
  for (const tr of trails) {
    tr.x += tr.vx
    tr.y += tr.vy
    tr.vx *= 0.96
    tr.vy *= 0.96
    tr.life++
    const a = Math.max(0, 1 - tr.life / tr.maxLife)
    ctx.beginPath()
    ctx.arc(tr.x, tr.y, tr.size * a, 0, Math.PI * 2)
    ctx.fillStyle = `rgba(186,230,253,${a * 0.9})`
    ctx.shadowColor = 'rgba(125,211,252,0.8)'
    ctx.shadowBlur = 6
    ctx.fill()
    ctx.shadowBlur = 0
  }
  for (let i = trails.length - 1; i >= 0; i--) {
    if (trails[i].life >= trails[i].maxLife) trails.splice(i, 1)
  }

  raf = requestAnimationFrame(draw)
}

function onResize() {
  resize()
}

// 标签页切到后台时暂停动画（省电省 CPU），回到前台恢复
function onVisibility() {
  if (document.hidden) {
    if (raf) {
      cancelAnimationFrame(raf)
      raf = 0
    }
  } else if (!raf) {
    raf = requestAnimationFrame(draw)
  }
}

onMounted(() => {
  // 尊重系统「减弱动态效果」偏好：开启时只画静态星空，不跑动画循环
  const reduceMotion =
    typeof window !== 'undefined' &&
    window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches

  setup()

  if (reduceMotion) {
    // 仅绘制一帧静态星空
    if (ctx) {
      for (const s of stars) {
        ctx.beginPath()
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(255,255,255,${s.base})`
        ctx.fill()
      }
    }
    window.addEventListener('resize', onResize)
    return
  }

  raf = requestAnimationFrame(draw)
  window.addEventListener('resize', onResize)
  document.addEventListener('visibilitychange', onVisibility)
  if (props.interactive) window.addEventListener('mousemove', onMouseMove)
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
