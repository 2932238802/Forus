import { onMounted, onUnmounted } from 'vue'

/**
 * 轻量轮询，替代 Supabase Realtime：
 * - 首次挂载立即拉取一次；
 * - 每 interval 毫秒刷新，页面隐藏时跳过；
 * - 切回前台立即刷新；
 * - 组件卸载时清理定时器与监听。
 */
export function usePolling(
  fetchAll: () => void | Promise<void>,
  interval = 30_000,
) {
  let timer: ReturnType<typeof setInterval> | null = null

  function refreshIfVisible() {
    if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return
    void fetchAll()
  }

  function onVisibilityChange() {
    if (document.visibilityState === 'visible') void fetchAll()
  }

  onMounted(() => {
    void fetchAll()
    timer = setInterval(refreshIfVisible, interval)
    document.addEventListener('visibilitychange', onVisibilityChange)
  })

  onUnmounted(() => {
    if (timer) clearInterval(timer)
    timer = null
    document.removeEventListener('visibilitychange', onVisibilityChange)
  })
}
