import { signToken, UNLOCK_COOKIE } from '~/server/utils/token'

/**
 * POST /api/unlock  { passphrase: string }
 * 校验暗号；正确则下发 HttpOnly 签名 Cookie 并返回 { ok: true }。
 * 暗号比对在服务端进行，前端 JS 永远拿不到明文暗号。
 */
export default defineEventHandler(async (event) => {
  const { passphrase } = await readBody<{ passphrase?: string }>(event)
  const config = useRuntimeConfig()

  if (!passphrase || passphrase.trim() !== String(config.passphrase)) {
    // 故意不区分「没传」和「错误」，避免泄露信息
    setResponseStatus(event, 401)
    return { ok: false }
  }

  const token = signToken(config.authSecret)
  setCookie(event, UNLOCK_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: !import.meta.dev, // 生产强制 https
    path: '/',
    maxAge: 180 * 24 * 60 * 60, // 180 天
  })
  return { ok: true }
})
