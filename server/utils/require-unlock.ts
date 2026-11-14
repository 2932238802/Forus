import type { H3Event } from 'h3'
import { verifyToken, UNLOCK_COOKIE } from './token'

export type IdentityKey = 'you' | 'npy'

/** 校验解锁 Cookie；失败抛 401。 */
export function requireUnlocked(event: H3Event): void {
  const config = useRuntimeConfig()
  const token = getCookie(event, UNLOCK_COOKIE)
  if (!verifyToken(token, config.authSecret)) {
    throw createError({ statusCode: 401, statusMessage: '未解锁' })
  }
}

/**
 * 身份由已解锁设备自行声明。两个人共用暗号，因此这里只做格式校验，
 * 不是额外权限边界；真正的权限（信件归属、到期时间）由服务端规则保证。
 */
export function parseIdentity(value: unknown): IdentityKey {
  if (value === 'you' || value === 'npy') return value
  throw createError({ statusCode: 400, statusMessage: '身份无效' })
}

export function partnerOf(identity: IdentityKey): IdentityKey {
  return identity === 'you' ? 'npy' : 'you'
}
