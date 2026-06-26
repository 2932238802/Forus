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

/**
 * 在一起的精确时长（实时跳动用）。
 * 从起始日 00:00:00 算到此刻，拆成 天/时/分/秒。
 */
export function togetherDuration(startStr: string = siteConfig.startDate): {
  days: number
  hours: number
  minutes: number
  seconds: number
  totalSeconds: number
} {
  const start = new Date(startStr + 'T00:00:00').getTime()
  const now = Date.now()
  let diff = Math.max(0, Math.floor((now - start) / 1000)) // 总秒数
  const totalSeconds = diff
  const days = Math.floor(diff / 86400)
  diff -= days * 86400
  const hours = Math.floor(diff / 3600)
  diff -= hours * 3600
  const minutes = Math.floor(diff / 60)
  const seconds = diff - minutes * 60
  return { days, hours, minutes, seconds, totalSeconds }
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

/** 今天命中的庆祝事件类型 */
export interface Celebration {
  kind: 'anniversary' | 'hundred' | 'birthday-you' | 'birthday-npy'
  title: string // 主标题
  subtitle: string // 副标题
  emoji: string
  /** 当天唯一标识，用于「每天只自动触发一次」 */
  todayKey: string
}

/**
 * 判断今天是否是特殊日子。命中返回 Celebration，否则返回 null。
 * 优先级：周年 > 生日 > 整百天（同一天命中多个时取最隆重的）。
 */
export function todayCelebration(now: Date = new Date()): Celebration | null {
  const pad = (n: number) => String(n).padStart(2, '0')
  const mmdd = `${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
  const todayKey = `${now.getFullYear()}-${mmdd}`

  const start = new Date(siteConfig.startDate + 'T00:00:00')
  const startMmdd = `${pad(start.getMonth() + 1)}-${pad(start.getDate())}`

  // 1) 周年（今天 = 起始日的月日，且不是第 0 年）
  if (mmdd === startMmdd && now.getFullYear() > start.getFullYear()) {
    const years = now.getFullYear() - start.getFullYear()
    return {
      kind: 'anniversary',
      title: `${years} 周年快乐`,
      subtitle: `在一起的第 ${years} 年 🤍`,
      emoji: '🎉',
      todayKey: `cele-${todayKey}-anniv`,
    }
  }

  // 2) 生日
  if (mmdd === siteConfig.birthdayNpy) {
    return {
      kind: 'birthday-npy',
      title: `${siteConfig.npy} 生日快乐`,
      subtitle: '今天是属于你的日子 🎂',
      emoji: '🎂',
      todayKey: `cele-${todayKey}-bd-npy`,
    }
  }
  if (mmdd === siteConfig.birthdayYou) {
    return {
      kind: 'birthday-you',
      title: `${siteConfig.you} 生日快乐`,
      subtitle: '今天是属于你的日子 🎂',
      emoji: '🎂',
      todayKey: `cele-${todayKey}-bd-you`,
    }
  }

  // 3) 整百天（在一起天数是 100 的倍数）
  const days = daysSince(siteConfig.startDate)
  if (days > 0 && days % 100 === 0) {
    return {
      kind: 'hundred',
      title: `在一起 ${days} 天`,
      subtitle: '又一个一百天，谢谢你一直在 💕',
      emoji: '💯',
      todayKey: `cele-${todayKey}-d${days}`,
    }
  }

  return null
}
