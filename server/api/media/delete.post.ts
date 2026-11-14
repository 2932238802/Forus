import { unlink } from 'node:fs/promises'
import { resolve, sep } from 'node:path'
import { requireUnlocked } from '~/server/utils/require-unlock'
import { resolveUploadsDir } from '~/server/utils/uploads-dir'

/**
 * POST /api/media/delete
 * body: { paths: string[] }
 * 删除本地上传目录中的文件；路径必须落在上传目录内，防止路径穿越。
 */
export default defineEventHandler(async (event) => {
  requireUnlocked(event)

  const body = await readBody<{ paths?: unknown }>(event)
  const paths = Array.isArray(body.paths)
    ? body.paths
        .filter((p): p is string => typeof p === 'string')
        .map((p) => p.trim())
        .filter((p) => p && !p.includes('..') && !p.startsWith('/') && p.length <= 512)
        .slice(0, 20)
    : []

  if (!paths.length) {
    throw createError({ statusCode: 400, statusMessage: '没有需要删除的文件' })
  }

  const base = resolve(resolveUploadsDir())

  let removed = 0
  for (const path of paths) {
    const target = resolve(base, path)
    if (!target.startsWith(base + sep)) continue
    try {
      await unlink(target)
      removed++
    } catch (err: unknown) {
      if ((err as NodeJS.ErrnoException)?.code !== 'ENOENT') throw err
    }
  }

  return { ok: true, removed }
})
