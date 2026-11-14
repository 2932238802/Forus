import { ref, onMounted, onUnmounted } from 'vue'

// 模块级单例：全站共享同一个「今天」，每分钟刷新一次。
const today = ref<Date | null>(null)
let timer: ReturnType<typeof setInterval> | null = null
let users = 0

export function useToday() {
  onMounted(() => {
    today.value = new Date()
    users++
    if (!timer) {
      timer = setInterval(() => {
        today.value = new Date()
      }, 60_000)
    }
  })

  onUnmounted(() => {
    users--
    if (users <= 0 && timer) {
      clearInterval(timer)
      timer = null
      today.value = null
    }
  })

  return { today }
}
