<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'

const canvasRef = ref<HTMLCanvasElement | null>(null)
let ctx: CanvasRenderingContext2D | null = null
let raf = 0
let W = 0
let H = 0
let dpr = 1

// 背景静态星星
interface Star {
  x: number
  y: number
  r: number
  base: number
  twk: number
  phase: number
}
// 流星
interface Meteor {
  x: number
  y: number
  len: number
  speed: number
  size: number
  life: number
  maxLife: number
  active: boolean
}

const stars: Star[] = []
const meteors: Meteor[] = []

// 流星飞行方向：从右上 → 左下（与拖尾天然一致）
// 速度向量（左下）：vx<0, vy>0
const ANGLE = Math.PI * 0.78 // 约 140°，指向左下
const DIRX = Math.cos(ANGLE) // 负
const DIRY = Math.sin(ANGLE) // 正

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
  const count = Math.floor((W * H) / 6000) // 密度
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
  // 从屏幕上方/右侧边缘附近出现
  const startX = rand(W * 0.3, W * 1.1)
  const startY = rand(-H * 0.1, H * 0.4)
  const len = rand(140, 260)
  const speed = rand(6, 11)
  meteors.push({
    x: startX,
    y: startY,
    len,
    speed,
    size: rand(1.2, 2.2),
    life: 0,
    maxLife: rand(60, 110),
    active: true,
  })
}

let t = 0
let nextSpawn = 30
function draw() {
  if (!ctx) return
  t++

  // 清空（透明，露出 CSS 夜空背景）
  ctx.clearRect(0, 0, W, H)

  // 星星
  for (const s of stars) {
    const a = s.base + Math.sin(t * 0.02 + s.phase) * s.twk
    ctx.beginPath()
    ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2)
    ctx.fillStyle = `rgba(255,255,255,${Math.max(0, Math.min(1, a))})`
    ctx.fill()
  }

  // 生成流星
  if (t >= nextSpawn) {
    spawnMeteor()
    nextSpawn = t + rand(70, 160)
  }

  // 画流星
  for (const m of meteors) {
    if (!m.active) continue
    m.x += DIRX * m.speed
    m.y += DIRY * m.speed
    m.life++

    // 淡入淡出
    const p = m.life / m.maxLife
    let alpha = 1
    if (p < 0.15) alpha = p / 0.15
    else if (p > 0.7) alpha = Math.max(0, (1 - p) / 0.3)

    // 拖尾末端 = 头部 - 方向 * 长度（尾巴在身后，物理正确）
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

    // 头部光点
    ctx.beginPath()
    ctx.arc(m.x, m.y, m.size * 1.1, 0, Math.PI * 2)
    ctx.fillStyle = `rgba(255,255,255,${alpha})`
    ctx.shadowColor = 'rgba(186,230,253,0.9)'
    ctx.shadowBlur = 8
    ctx.fill()
    ctx.shadowBlur = 0

    if (m.life >= m.maxLife || m.x < -m.len || m.y > H + m.len) {
      m.active = false
    }
  }

  // 回收
  for (let i = meteors.length - 1; i >= 0; i--) {
    if (!meteors[i].active) meteors.splice(i, 1)
  }

  raf = requestAnimationFrame(draw)
}

function onResize() {
  resize()
}

onMounted(() => {
  setup()
  raf = requestAnimationFrame(draw)
  window.addEventListener('resize', onResize)
})

onUnmounted(() => {
  cancelAnimationFrame(raf)
  window.removeEventListener('resize', onResize)
})
</script>

<template>
  <canvas ref="canvasRef" class="pointer-events-none fixed inset-0 h-full w-full" />
</template>
