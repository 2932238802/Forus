/**
 * 从媒体 URL 中解析出可删除的文件路径。
 * - 本地上传：/uploads/<path>
 * - 历史 Supabase 公链：.../storage/v1/object/public/media/<path>
 * 非本站存储返回 null。
 */
export function extractStoragePath(url: string): string | null {
  if (url.startsWith('/uploads/')) {
    return decodeURIComponent(url.slice('/uploads/'.length))
  }

  const marker = '/storage/v1/object/public/media/'
  const index = url.indexOf(marker)
  if (index === -1) return null
  return decodeURIComponent(url.slice(index + marker.length))
}
