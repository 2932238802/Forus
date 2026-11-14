import { useDb } from '~/composables/useDb'
import { extractStoragePath } from '~/utils/storage'

/**
 * 纯媒体工具：只负责上传 / 删除 Storage 文件，不拉取列表、不建立实时订阅。
 * 这样留言墙等只需要上传能力的组件不会再额外订阅 media 表。
 */
export function useMediaUpload() {
  const supabase = useDb()

  function newFileName(ext: string): string {
    if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
      return `${crypto.randomUUID()}.${ext}`
    }
    return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}.${ext}`
  }

  /** 上传文件到 media 桶，图片自动压缩，返回公链、类型与路径。 */
  async function upload(
    file: File,
  ): Promise<{ url: string; kind: 'image' | 'video'; path: string }> {
    const kind = file.type.startsWith('video') ? 'video' : 'image'
    const finalFile = kind === 'image' ? await compressImage(file) : file
    const ext = finalFile.name.split('.').pop()?.toLowerCase() || 'bin'
    const path = newFileName(ext)

    const { error } = await supabase.storage.from('media').upload(path, finalFile, {
      cacheControl: '3600',
      upsert: false,
    })
    if (error) throw error

    const { data } = supabase.storage.from('media').getPublicUrl(path)
    return { url: data.publicUrl, kind, path }
  }

  /** 通过服务端删除 Storage 文件（anon 已无删除权限）。 */
  async function remove(paths: string[]) {
    const clean = paths
      .map((p) => p.trim())
      .filter((p) => p && !p.includes('..') && !p.startsWith('/') && p.length <= 512)
      .slice(0, 20)
    if (!clean.length) return
    await $fetch('/api/media/delete', { method: 'POST', body: { paths: clean } })
  }

  /** 从公链解析路径后删除；外链自动忽略。 */
  async function removeUrl(url: string) {
    const path = extractStoragePath(url)
    if (path) await remove([path])
  }

  return { upload, remove, removeUrl }
}
