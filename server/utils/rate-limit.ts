/**
 * 进程内解锁失败限流。
 *
 * 注意：Serverless 多实例之间不共享内存。生产环境仍建议在平台 / 反向代理层
 * 增加全局速率限制；这里主要负责挡住单实例上的暴力尝试。
 */
interface Bucket {
  failures: number
  windowStart: number
  blockedUntil: number
}

const buckets = new Map<string, Bucket>()

export const WINDOW_MS = 15 * 60 * 1000
export const BLOCK_MS = 15 * 60 * 1000
export const MAX_FAILURES = 5
const MAX_KEYS = 10_000

function prune(now: number) {
  for (const [key, bucket] of buckets) {
    if (bucket.blockedUntil > now) continue
    if (bucket.blockedUntil > 0 || now - bucket.windowStart > WINDOW_MS) {
      buckets.delete(key)
    }
  }

  if (buckets.size > MAX_KEYS) {
    const entries = [...buckets.entries()].sort(
      (a, b) => a[1].windowStart - b[1].windowStart,
    )
    for (let i = 0; i < entries.length - MAX_KEYS; i++) {
      buckets.delete(entries[i][0])
    }
  }
}

export function isBlocked(
  key: string,
  now: number = Date.now(),
): { blocked: boolean; retryAfter: number } {
  prune(now)
  const bucket = buckets.get(key)
  if (!bucket) return { blocked: false, retryAfter: 0 }
  if (bucket.blockedUntil > now) {
    return {
      blocked: true,
      retryAfter: Math.ceil((bucket.blockedUntil - now) / 1000),
    }
  }
  return { blocked: false, retryAfter: 0 }
}

export function recordFailure(key: string, now: number = Date.now()): void {
  prune(now)
  let bucket = buckets.get(key)
  if (!bucket || now - bucket.windowStart > WINDOW_MS) {
    bucket = { failures: 0, windowStart: now, blockedUntil: 0 }
    buckets.set(key, bucket)
  }
  bucket.failures++
  if (bucket.failures >= MAX_FAILURES) {
    bucket.blockedUntil = now + BLOCK_MS
  }
}

export function clearFailures(key: string): void {
  buckets.delete(key)
}
