import { createReadStream } from 'node:fs'
import { stat } from 'node:fs/promises'
import { extname, join, resolve, sep } from 'node:path'

const MIME: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.mov': 'video/quicktime',
}

/**
 * GET /uploads/<file>
 * 开发环境由 Nitro 直接服务本地上传目录；生产环境通常由 nginx 的
 * `/uploads/` location 优先命中，不会走到这里。
 */
export default defineEventHandler(async (event) => {
  const path = getRouterParam(event, 'path') || ''
  const config = useRuntimeConfig()
  const base = resolve(String(config.uploadsDir || join(process.cwd(), '.data/uploads')))
  const target = resolve(base, path)

  if (!target.startsWith(base + sep)) {
    throw createError({ statusCode: 400 })
  }

  const info = await stat(target).catch(() => null)
  if (!info?.isFile()) {
    throw createError({ statusCode: 404 })
  }

  setHeader(event, 'Content-Type', MIME[extname(target).toLowerCase()] || 'application/octet-stream')
  setHeader(event, 'X-Content-Type-Options', 'nosniff')
  setHeader(event, 'Cache-Control', 'public, max-age=604800')
  return sendStream(event, createReadStream(target))
})
