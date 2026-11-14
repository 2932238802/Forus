function pad(n: number): string {
  return String(n).padStart(2, '0')
}

/** 服务端统一使用北京时间判断「今天」，避免部署在 UTC 时区时日期偏移。 */
export function todayBeijing(now: Date = new Date()): string {
  const bj = new Date(now.getTime() + 8 * 3600 * 1000)
  return `${bj.getUTCFullYear()}-${pad(bj.getUTCMonth() + 1)}-${pad(bj.getUTCDate())}`
}

/** 校验 YYYY-MM-DD，并拒绝 2026-02-31 这类会被 Date 自动进位的日期。 */
export function isValidDateString(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const d = new Date(value + 'T00:00:00Z')
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === value
}

/** 按北京时间计算「在一起第几天」（起始日 = 第 1 天）。 */
export function daysTogetherBeijing(startDate: string, now: Date = new Date()): number {
  const [y, m, d] = startDate.split('-').map(Number)
  const start = Date.UTC(y, (m || 1) - 1, d || 1)
  const bj = new Date(now.getTime() + 8 * 3600 * 1000)
  const today = Date.UTC(bj.getUTCFullYear(), bj.getUTCMonth(), bj.getUTCDate())
  return Math.max(0, Math.floor((today - start) / 86400000) + 1)
}

