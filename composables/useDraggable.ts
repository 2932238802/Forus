import { ref, computed, onMounted, onUnmounted, type Ref } from 'vue'

/**
 * 让一个浮动元素可拖动（鼠标 + 触摸），位置记到 localStorage。
 *
 * 两种用法：
 * 1) 拖动手柄 = 被定位元素本身（如小猫按钮）：
 *      const { style, onPointerDown } = useDraggable('key', { right: 20, bottom: 112 })
 *      <button :style="style" @pointerdown="onPointerDown">
 *
 * 2) 拖动手柄 ≠ 被定位元素（如导航：容器是定位元素，月亮按钮是手柄）：
 *      const containerRef = ref<HTMLElement|null>(null)
 *      const { style, onPointerDown } = useDraggable('key', { left:16, bottom:16 }, containerRef)
 *      <div ref="containerRef" :style="style"> ... <button @pointerdown="onPointerDown"> </div>
 *    传入 containerRef 后，拖动以容器的位置/尺寸为准，避免手柄与容器错位。
 */
export function useDraggable(
  storageKey: string,
  fallback: { right?: number; bottom?: number; left?: number; top?: number } = {},
  containerRef?: Ref<HTMLElement | null>,
) {
  const pos = ref<{ left: number; top: number } | null>(null)
  const dragging = ref(false)
  const justDragged = ref(false)

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
    // 被定位的元素：优先用 containerRef（容器），否则用事件源本身
    const el = (containerRef?.value ?? (e.currentTarget as HTMLElement))
    if (!el) return
    const rect = el.getBoundingClientRect()
    elSize = { w: rect.width, h: rect.height }
    originLeft = rect.left
    originTop = rect.top
    startX = e.clientX
    startY = e.clientY
    justDragged.value = false
    dragging.value = true
    // 把当前真实位置同步给 pos（从 right/bottom 锚定平滑切到 left/top 锚定，避免跳位）
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
      setTimeout(() => (justDragged.value = false), 50)
    }
  }

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
