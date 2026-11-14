/**
 * 从 Supabase Storage 公链中解析出 bucket 内的文件路径。
 * 公链格式：.../storage/v1/object/public/media/<path>
 * 非本站存储返回 null。
 */
export function extractStoragePath(url: string): string | null {
  const marker = '/storage/v1/object/public/media/'
  const index = url.indexOf(marker)
  if (index === -1) return null
  return decodeURIComponent(url.slice(index + marker.length))
}
