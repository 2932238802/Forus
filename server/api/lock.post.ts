import { UNLOCK_COOKIE } from '~/server/utils/token'

/**
 * POST /api/lock
 * 清除解锁 Cookie（上锁离开）。
 */
export default defineEventHandler((event) => {
  deleteCookie(event, UNLOCK_COOKIE, { path: '/' })
  return { ok: true }
})
