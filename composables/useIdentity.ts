import { ref } from 'vue'
import { siteConfig } from '~/data/site'

/**
 * 身份系统（方案 A）：暗号正确后，在本设备选一次「我是谁」，永久记住。
 * 身份不是安全凭证（安全由暗号 Cookie 负责），只是「这台设备是谁在用」的偏好，
 * 因此用 localStorage 存储即可。
 *
 * 两个身份：
 *  - 'you' → siteConfig.you  （LosAngelous）
 *  - 'npy' → siteConfig.npy  （在野 / 啟艳）
 */
export type IdentityKey = 'you' | 'npy'

export interface Identity {
  key: IdentityKey
  name: string // 显示名
}

const STORAGE_KEY = 'forus_identity'

// 模块级单例：全站共享当前身份
const identityKey = ref<IdentityKey | null>(null)

/** 两个可选身份（显示名取自 siteConfig）；在野默认在前 */
export const IDENTITIES: Identity[] = [
  { key: 'npy', name: siteConfig.npy },
  { key: 'you', name: siteConfig.you },
]

export function useIdentity() {
  /** 从本设备读取已选身份（客户端调用） */
  function load() {
    if (!import.meta.client) return
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved === 'you' || saved === 'npy') identityKey.value = saved
    } catch {
      /* ignore */
    }
  }

  /** 选择身份并记住本设备 */
  function choose(key: IdentityKey) {
    identityKey.value = key
    if (import.meta.client) {
      try {
        localStorage.setItem(STORAGE_KEY, key)
      } catch {
        /* ignore */
      }
    }
  }

  /** 清除身份（与上锁一起用） */
  function clear() {
    identityKey.value = null
    if (import.meta.client) {
      try {
        localStorage.removeItem(STORAGE_KEY)
      } catch {
        /* ignore */
      }
    }
  }

  /** 当前身份的显示名 */
  function nameOf(key: IdentityKey | null): string {
    if (key === 'you') return siteConfig.you
    if (key === 'npy') return siteConfig.npy
    return ''
  }

  /** 对方的身份 key（用于「想你了」等需要指向 TA 的功能） */
  function partnerOf(key: IdentityKey | null): IdentityKey | null {
    if (key === 'you') return 'npy'
    if (key === 'npy') return 'you'
    return null
  }

  return {
    identityKey, // 当前身份 key（响应式，null 表示未选）
    identities: IDENTITIES,
    load,
    choose,
    clear,
    nameOf,
    partnerOf,
  }
}
