import { extractStoragePath } from '~/utils/storage'

/**
 * 纯媒体工具：只负责上传 / 删除本地文件，不拉取列表、不建立任何订阅。
 * 这样留言墙等只需要上传能力的组件不会额外订阅 media 表。
 */
export function useMediaUpload() {
  /** 上传文件到本地 /uploads，图片自动压缩，返回相对 URL、类型与文件名。 */
  async function upload(
    file: File,
  ): Promise<{ url: string; kind: 'image' | 'video'; path: string }> {
    const kind = file.type.startsWith('video') ? 'video' : 'image'
    const finalFile = kind === 'image' ? await compressImage(file) : file

    const form = new FormData()
    form.append('file', finalFile, finalFile.name)
    const res = await $fetch<{ url: string; path: string }>('/api/upload', {
      method: 'POST',
      body: form,
    })

    return { url: res.url, kind, path: res.path }
  }

  /** 通过服务端删除本地文件。 */
  async function remove(paths: string[]) {
    const clean = paths
      .map((p) => p.trim())
      .filter((p) => p && !p.includes('..') && !p.startsWith('/') && p.length <= 512)
      .slice(0, 20)
    if (!clean.length) return
    await $fetch('/api/media/delete', { method: 'POST', body: { paths: clean } })
  }

  /** 从本地 URL 或历史 Supabase 公链解析路径后删除；外链自动忽略。 */
  async function removeUrl(url: string) {
    const path = extractStoragePath(url)
    if (path) await remove([path])
  }

  return { upload, remove, removeUrl }
}
