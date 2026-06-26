import { ref, computed, onMounted, onUnmounted } from 'vue'

/**
 * 让一个浮动元素可拖动（鼠标 + 触摸），位置记到 localStorage。
 * 用法：
 *   const { style, onPointerDown, dragging, justDragged } = useDraggable('forus_cat_pos', { right: 20, bottom: 112 })
 *   <button :style="style" @pointerdown="onPointerDown" @click="justDragged ? null : doSomething()">
 *
 * 拖动用 left/top 定位；未拖动过时用传入的默认位置(right/bottom/left/top)。
 */
export function useDraggable(
  storageKey: string,
  fallback: { right?: number; bottom?: number; left?: number; top?: number } = {},
) {
  const pos = ref<{ left: number; top: number } | null>(null)
  const dragging = ref(false)
  const justDragged = ref(false) // 刚拖动过（用于阻止误触发 click）

  let startX = 0
  let startY = 0
  let originLeft = 0
  let originTop = 0
  let elSize = { w: 56, h: 56 }

  function load() {
    try {
      const raw = localStorage.getItem(storageKey)
      if (raw) {
        const p = JSON.parse(raw)
        if (typeof p.left === 'number' && typeof p.top === 'number') {
          pos.value = clamp(p.left, p.top)
        }
      }
    } catch {
      /* ignore */
    }
  }

  function clamp(left: number, top: number) {
    const margin = 4
    const maxLeft = window.innerWidth - elSize.w - margin
    const maxTop = window.innerHeight - elSize.h - margin
    return {
      left: Math.max(margin, Math.min(left, maxLeft)),
      top: Math.max(margin, Math.min(top, maxTop)),
    }
  }

  function onPointerDown(e: PointerEvent) {
    const el = e.currentTarget as HTMLElement
    const rect = el.getBoundingClientRect()
    elSize = { w: rect.width, h: rect.height }
    originLeft = rect.left
    originTop = rect.top
    startX = e.clientX
    startY = e.clientY
    justDragged.value = false
    dragging.value = true
    pos.value = { left: originLeft, top: originTop }
    window.addEventListener('pointermove', onPointerMove)
    window.addEventListener('pointerup', onPointerUp)
  }

  function onPointerMove(e: PointerEvent) {
    const dx = e.clientX - startX
    const dy = e.clientY - startY
    if (Math.abs(dx) > 3 || Math.abs(dy) > 3) justDragged.value = true
    pos.value = clamp(originLeft + dx, originTop + dy)
  }

  function onPointerUp() {
    dragging.value = false
    window.removeEventListener('pointermove', onPointerMove)
    window.removeEventListener('pointerup', onPointerUp)
    if (justDragged.value && pos.value) {
      try {
        localStorage.setItem(storageKey, JSON.stringify(pos.value))
      } catch {
        /* ignore */
      }
      // 稍后清除标记，让本次 click 被忽略
      setTimeout(() => (justDragged.value = false), 50)
    }
  }

  // style 自动跟随 pos 变化
  const style = computed<Record<string, string>>(() => {
    if (pos.value) {
      return {
        left: pos.value.left + 'px',
        top: pos.value.top + 'px',
        right: 'auto',
        bottom: 'auto',
      }
    }
    const s: Record<string, string> = {}
    if (fallback.right != null) s.right = fallback.right + 'px'
    if (fallback.bottom != null) s.bottom = fallback.bottom + 'px'
    if (fallback.left != null) s.left = fallback.left + 'px'
    if (fallback.top != null) s.top = fallback.top + 'px'
    return s
  })

  onMounted(load)
  onUnmounted(() => {
    window.removeEventListener('pointermove', onPointerMove)
    window.removeEventListener('pointerup', onPointerUp)
  })

  return { style, pos, dragging, justDragged, onPointerDown }
}
