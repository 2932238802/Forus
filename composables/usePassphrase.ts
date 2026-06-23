import { ref, onMounted } from 'vue'
import { siteConfig } from '~/data/site'

const STORAGE_KEY = 'forus_unlocked'

export function usePassphrase() {
  const unlocked = ref(false)

  onMounted(() => {
    try {
      if (localStorage.getItem(STORAGE_KEY) === '1') unlocked.value = true
    } catch {
      /* ignore */
    }
  })

  /** 校验暗号，正确则解锁并记住本设备 */
  function tryUnlock(input: string): boolean {
    if (input.trim() === siteConfig.passphrase) {
      unlocked.value = true
      try {
        localStorage.setItem(STORAGE_KEY, '1')
      } catch {
        /* ignore */
      }
      return true
    }
    return false
  }

  /** 上锁（清除本设备记忆） */
  function lock() {
    unlocked.value = false
    try {
      localStorage.removeItem(STORAGE_KEY)
    } catch {
      /* ignore */
    }
  }

  return { unlocked, tryUnlock, lock }
}
