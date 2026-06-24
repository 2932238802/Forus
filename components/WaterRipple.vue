<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'

const props = withDefaults(defineProps<{ src?: string }>(), {
  src: '/lake.jpg',
})
const emit = defineEmits<{ drop: [payload: { x: number; y: number; big: boolean }] }>()

const canvasRef = ref<HTMLCanvasElement | null>(null)
let gl: WebGLRenderingContext | null = null
let raf = 0
let W = 0
let H = 0

// 双缓冲高度场（模拟水面波动）
const SIM = 256 // 模拟分辨率
let bufA: Float32Array
let bufB: Float32Array
let texture: WebGLTexture | null = null
let img: HTMLImageElement | null = null
let imgLoaded = false

// 在高度场某点注入扰动（点击/丢石子）
function disturb(nx: number, ny: number, strength: number, radius: number) {
  const cx = Math.floor(nx * SIM)
  const cy = Math.floor(ny * SIM)
  for (let dy = -radius; dy <= radius; dy++) {
    for (let dx = -radius; dx <= radius; dx++) {
      const x = cx + dx
      const y = cy + dy
      if (x < 1 || y < 1 || x >= SIM - 1 || y >= SIM - 1) continue
      const d = Math.sqrt(dx * dx + dy * dy)
      if (d > radius) continue
      const falloff = Math.cos((d / radius) * Math.PI * 0.5)
      bufA[y * SIM + x] += strength * falloff
    }
  }
}

// 水面波动数值模拟（波动方程）
function stepSim() {
  for (let y = 1; y < SIM - 1; y++) {
    for (let x = 1; x < SIM - 1; x++) {
      const i = y * SIM + x
      const avg =
        (bufA[i - 1] + bufA[i + 1] + bufA[i - SIM] + bufA[i + SIM]) * 0.5 - bufB[i]
      bufB[i] = avg * 0.96 // 阻尼
    }
  }
  const tmp = bufA
  bufA = bufB
  bufB = tmp
}

// ---- WebGL 着色器 ----
const VERT = `
attribute vec2 a_pos;
varying vec2 v_uv;
void main(){
  v_uv = (a_pos + 1.0) * 0.5;
  v_uv.y = 1.0 - v_uv.y;
  gl_Position = vec4(a_pos, 0.0, 1.0);
}`

const FRAG = `
precision mediump float;
varying vec2 v_uv;
uniform sampler2D u_img;
uniform sampler2D u_height;
uniform vec2 u_texel;
void main(){
  // 通过高度场计算法线，折射背景图
  float hL = texture2D(u_height, v_uv - vec2(u_texel.x, 0.0)).r;
  float hR = texture2D(u_height, v_uv + vec2(u_texel.x, 0.0)).r;
  float hU = texture2D(u_height, v_uv - vec2(0.0, u_texel.y)).r;
  float hD = texture2D(u_height, v_uv + vec2(0.0, u_texel.y)).r;
  vec2 grad = vec2(hR - hL, hD - hU);
  vec2 uv = v_uv + grad * 0.18;
  vec4 col = texture2D(u_img, uv);
  // 高光：坡度产生亮边（柔和）
  float spec = clamp((hR - hL) * 1.5, -0.12, 0.22);
  col.rgb += spec;
  gl_FragColor = col;
}`

function compile(type: number, src: string) {
  const s = gl!.createShader(type)!
  gl!.shaderSource(s, src)
  gl!.compileShader(s)
  return s
}

let program: WebGLProgram | null = null
let heightTex: WebGLTexture | null = null
let heightData: Uint8Array

function initGL() {
  const canvas = canvasRef.value!
  gl = canvas.getContext('webgl')
  if (!gl) return false

  const vs = compile(gl.VERTEX_SHADER, VERT)
  const fs = compile(gl.FRAGMENT_SHADER, FRAG)
  program = gl.createProgram()!
  gl.attachShader(program, vs)
  gl.attachShader(program, fs)
  gl.linkProgram(program)
  gl.useProgram(program)

  // 全屏四边形
  const buf = gl.createBuffer()
  gl.bindBuffer(gl.ARRAY_BUFFER, buf)
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW)
  const loc = gl.getAttribLocation(program, 'a_pos')
  gl.enableVertexAttribArray(loc)
  gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0)

  // 背景图纹理
  texture = gl.createTexture()
  gl.bindTexture(gl.TEXTURE_2D, texture)
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([20, 30, 50, 255]))
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)

  // 高度场纹理
  heightTex = gl.createTexture()
  heightData = new Uint8Array(SIM * SIM * 4)
  gl.bindTexture(gl.TEXTURE_2D, heightTex)
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, SIM, SIM, 0, gl.RGBA, gl.UNSIGNED_BYTE, heightData)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)

  gl.uniform1i(gl.getUniformLocation(program, 'u_img'), 0)
  gl.uniform1i(gl.getUniformLocation(program, 'u_height'), 1)
  gl.uniform2f(gl.getUniformLocation(program, 'u_texel'), 1 / SIM, 1 / SIM)

  // 加载背景图
  img = new Image()
  img.crossOrigin = 'anonymous'
  img.onload = () => {
    imgLoaded = true
    gl!.activeTexture(gl!.TEXTURE0)
    gl!.bindTexture(gl!.TEXTURE_2D, texture)
    gl!.texImage2D(gl!.TEXTURE_2D, 0, gl!.RGBA, gl!.RGBA, gl!.UNSIGNED_BYTE, img!)
  }
  img.src = props.src
  return true
}

function render() {
  if (!gl || !program) return
  stepSim()

  // 把高度场写入纹理
  for (let i = 0; i < SIM * SIM; i++) {
    const v = Math.max(0, Math.min(255, 128 + bufA[i] * 127))
    heightData[i * 4] = v
    heightData[i * 4 + 1] = v
    heightData[i * 4 + 2] = v
    heightData[i * 4 + 3] = 255
  }
  gl.activeTexture(gl.TEXTURE1)
  gl.bindTexture(gl.TEXTURE_2D, heightTex)
  gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, SIM, SIM, gl.RGBA, gl.UNSIGNED_BYTE, heightData)

  gl.activeTexture(gl.TEXTURE0)
  gl.bindTexture(gl.TEXTURE_2D, texture)

  gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)
  raf = requestAnimationFrame(render)
}

function resize() {
  const canvas = canvasRef.value!
  W = window.innerWidth
  H = window.innerHeight
  canvas.width = W
  canvas.height = H
  canvas.style.width = W + 'px'
  canvas.style.height = H + 'px'
  if (gl) gl.viewport(0, 0, W, H)
}

// 点击湖面：在该位置注入波纹（轻柔涟漪）
function onClick(e: MouseEvent) {
  const nx = e.clientX / W
  const ny = e.clientY / H
  disturb(nx, ny, 0.18, 4)
}

// 暴露给父组件：稍大波纹（点狮子），但依然温和
function bigDrop(clientX: number, clientY: number) {
  const nx = clientX / W
  const ny = clientY / H
  disturb(nx, ny, 0.5, 8)
}
defineExpose({ bigDrop })

function onResize() {
  resize()
}

onMounted(() => {
  bufA = new Float32Array(SIM * SIM)
  bufB = new Float32Array(SIM * SIM)
  if (!initGL()) {
    console.warn('WebGL 不可用')
    return
  }
  resize()
  raf = requestAnimationFrame(render)
  window.addEventListener('resize', onResize)
})
onUnmounted(() => {
  cancelAnimationFrame(raf)
  window.removeEventListener('resize', onResize)
})
</script>

<template>
  <canvas ref="canvasRef" class="absolute inset-0 h-full w-full cursor-pointer" @click="onClick" />
</template>
