import { join } from 'node:path'

/**
 * 解析本地上传目录。
 *
 * 服务器现有 compose 用的是单数 `NUXT_UPLOAD_DIR`，新方案文档用复数
 * `NUXT_UPLOADS_DIR`；这里两者都兼容，避免为了改名去动服务器配置。
 */
export function resolveUploadsDir(): string {
  const config = useRuntimeConfig()
  return String(
    config.uploadsDir ||
    process.env.NUXT_UPLOADS_DIR ||
    process.env.NUXT_UPLOAD_DIR ||
    process.env.FORUS_UPLOADS_DIR ||
    join(process.cwd(), '.data/uploads'),
  )
}
