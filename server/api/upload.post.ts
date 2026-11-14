import { mkdir, writeFile } from 'node:fs/promises'
import { randomUUID } from 'node:crypto'
import { join } from 'node:path'
import { requireUnlocked } from '~/server/utils/require-unlock'
import { resolveUploadsDir } from '~/server/utils/uploads-dir'

const MAX_BYTES = 25 * 1024 * 1024
const ALLOWED_EXT = new Set(['jpg', 'jpeg', 'png', 'webp', 'gif', 'mp4', 'webm', 'mov'])

/**
 * POST /api/upload
 * 接收 multipart `file`，落到本地上传目录，返回相对 URL 与文件名。
 * 只允许图片/视频扩展名，避免把 HTML/SVG 传到同源静态目录造成 XSS。
 */
export default defineEventHandler(async (event) => {
  requireUnlocked(event)

  const parts = await readMultipartFormData(event)
  const file = parts?.find((part) => part.name === 'file' && part.data)
  if (!file?.data) {
    throw createError({ statusCode: 400, statusMessage: '缺少文件' })
  }
  if (file.data.length > MAX_BYTES) {
    throw createError({ statusCode: 413, statusMessage: '文件超过 25MB' })
  }

  const ext = (file.filename || '').split('.').pop()?.toLowerCase() || ''
  if (!ALLOWED_EXT.has(ext)) {
    throw createError({ statusCode: 400, statusMessage: '不支持的文件类型' })
  }

  const dir = resolveUploadsDir()
  await mkdir(dir, { recursive: true })

  const name = `${randomUUID()}.${ext}`
  await writeFile(join(dir, name), file.data, { flag: 'wx' })
  return { ok: true, url: `/uploads/${name}`, path: name }
})
