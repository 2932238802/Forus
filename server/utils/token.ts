import { createHmac } from 'node:crypto'

/**
 * 生成一个带签名的解锁令牌。
 * 格式：<payload>.<signature>
 * payload 为签发时间戳（base64url），signature 为 HMAC-SHA256。
 * 这样前端无法伪造，也无法篡改有效期。
 */
export function signToken(secret: string): string {
  const payload = Buffer.from(String(Date.now())).toString('base64url')
  const sig = createHmac('sha256', secret).update(payload).digest('base64url')
  return `${payload}.${sig}`
}

/**
 * 校验解锁令牌是否合法（签名正确且未过期）。
 * @param maxAgeMs 令牌最长有效期，默认 180 天
 */
export function verifyToken(
  token: string | undefined,
  secret: string,
  maxAgeMs = 180 * 24 * 60 * 60 * 1000,
): boolean {
  if (!token) return false
  const parts = token.split('.')
  if (parts.length !== 2) return false
  const [payload, sig] = parts
  const expected = createHmac('sha256', secret).update(payload).digest('base64url')
  // 签名比对（长度不同直接失败，避免抛错）
  if (sig.length !== expected.length || sig !== expected) return false
  // 校验时效
  try {
    const ts = Number(Buffer.from(payload, 'base64url').toString())
    if (!Number.isFinite(ts)) return false
    if (Date.now() - ts > maxAgeMs) return false
  } catch {
    return false
  }
  return true
}

/** 解锁 Cookie 的名称 */
export const UNLOCK_COOKIE = 'forus_token'
