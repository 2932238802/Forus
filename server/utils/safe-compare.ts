import { createHash, timingSafeEqual } from 'node:crypto'

/**
 * 先做 SHA-256，再比较固定长度的摘要，避免长度差异泄露信息，
 * 也避免直接 timingSafeEqual 对不等长 Buffer 抛错。
 */
export function safeEqual(a: string, b: string): boolean {
  const ah = createHash('sha256').update(a).digest()
  const bh = createHash('sha256').update(b).digest()
  return timingSafeEqual(ah, bh)
}
