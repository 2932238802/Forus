import { verifyToken, UNLOCK_COOKIE } from '~/server/utils/token'

/**
 * GET /api/status
 * 返回当前请求是否已通过暗号解锁（校验 HttpOnly 签名 Cookie）。
 */
export default defineEventHandler((event) => {
  const config = useRuntimeConfig()
  const token = getCookie(event, UNLOCK_COOKIE)
  return { unlocked: verifyToken(token, config.authSecret) }
})
