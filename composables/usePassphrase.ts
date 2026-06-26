import { ref } from 'vue'

// 模块级单例：所有组件共享同一份解锁状态
const unlocked = ref(false)
const ready = ref(false) // 是否已完成首次服务端状态校验
let inflight: Promise<void> | null = null

export function usePassphrase() {
  /** 向服务端确认当前是否已解锁（校验 HttpOnly Cookie），只查一次 */
  async function refresh() {
    if (inflight) return inflight
    inflight = (async () => {
      try {
        const res = await $fetch<{ unlocked: boolean }>('/api/status')
        unlocked.value = !!res.unlocked
      } catch {
        unlocked.value = false
      } finally {
        ready.value = true
      }
    })()
    return inflight
  }

  /** 提交暗号到服务端校验；正确则服务端下发签名 Cookie */
  async function tryUnlock(input: string): Promise<boolean> {
    try {
      await $fetch('/api/unlock', {
        method: 'POST',
        body: { passphrase: input.trim() },
      })
      unlocked.value = true
      return true
    } catch {
      return false
    }
  }

  /** 上锁：请求服务端清除 Cookie */
  async function lock() {
    try {
      await $fetch('/api/lock', { method: 'POST' })
    } catch {
      /* ignore */
    }
    unlocked.value = false
  }

  return { unlocked, ready, refresh, tryUnlock, lock }
}
