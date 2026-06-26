// 日期相关工具
import { siteConfig } from '~/data/site'

/** 计算两个日期之间的天数（含今天） */
export function daysSince(dateStr: string): number {
  const start = new Date(dateStr + 'T00:00:00')
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const diff = today.getTime() - start.getTime()
  return Math.max(0, Math.floor(diff / 86400000) + 1)
}

/** 距离某个未来日期还有多少天 */
export function daysUntil(dateStr: string): number {
  const target = new Date(dateStr + 'T00:00:00')
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const diff = target.getTime() - today.getTime()
  return Math.ceil(diff / 86400000)
}

/** 在一起的天数 */
export function togetherDays(): number {
  return daysSince(siteConfig.startDate)
}

/** 格式化日期为 2024.05.20 */
export function formatDate(dateStr: string): string {
  return dateStr.replaceAll('-', '.')
}

/**
 * 基于恋爱起始日，自动算出「下一个还没到的周年」。
 * 返回该周年的日期字符串、距今天数、以及这是第几周年。
 * 例：起始 2026-06-22，今天 2027-07-01 → 下一个是 2028-06-22（两周年）。
 */
export function nextAnniversary(startStr: string = siteConfig.startDate): {
  date: string
  daysLeft: number
  yearsCount: number
  label: string
} {
  const start = new Date(startStr + 'T00:00:00')
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())

  // 从今年开始找第一个 >= 今天的周年
  let year = today.getFullYear()
  let target = new Date(year, start.getMonth(), start.getDate())
  while (target.getTime() < today.getTime()) {
    year++
    target = new Date(year, start.getMonth(), start.getDate())
  }

  const yearsCount = year - start.getFullYear()
  const daysLeft = Math.ceil((target.getTime() - today.getTime()) / 86400000)
  const pad = (n: number) => String(n).padStart(2, '0')
  const date = `${year}-${pad(start.getMonth() + 1)}-${pad(start.getDate())}`

  return { date, daysLeft, yearsCount, label: `${yearsCount} 周年` }
}
