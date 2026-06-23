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
