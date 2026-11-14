import type { IdentityKey } from './require-unlock'
import { isValidDateString, todayBeijing } from './date'

export interface LetterRow {
  id: string
  who_from: IdentityKey
  who_to: IdentityKey
  title: string
  content: string
  unlock_date: string
  created_at: string
}

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export function assertUuid(value: string | undefined): string {
  if (!value || !UUID_RE.test(value)) {
    throw createError({ statusCode: 400, statusMessage: '信件 ID 无效' })
  }
  return value
}

export function cleanTitle(value: unknown): string {
  return String(value ?? '').trim().slice(0, 40)
}

export function cleanContent(value: unknown): string {
  const content = String(value ?? '').trim()
  if (!content) {
    throw createError({ statusCode: 400, statusMessage: '信的内容不能为空' })
  }
  if (content.length > 5000) {
    throw createError({ statusCode: 400, statusMessage: '信的内容不能超过 5000 字' })
  }
  return content
}

export function cleanUnlockDate(value: unknown): string {
  const date = String(value ?? '').trim()
  if (!isValidDateString(date)) {
    throw createError({ statusCode: 400, statusMessage: '开启日期格式应为 YYYY-MM-DD' })
  }
  if (date < todayBeijing()) {
    throw createError({ statusCode: 400, statusMessage: '开启日期不能早于今天' })
  }
  return date
}

/** 收件人视角：到开启日当天即可阅读。 */
export function isUnlockedFor(row: LetterRow, identity: IdentityKey): boolean {
  if (row.who_from === identity) return true
  if (row.who_to !== identity) return false
  return row.unlock_date <= todayBeijing()
}
