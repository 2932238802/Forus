import { ref, onMounted, onUnmounted } from 'vue'
import { useSupabaseClient } from '#imports'
import type { MediaItem } from '~/types'

export function useMedia() {
  const supabase = useSupabaseClient()
  const media = ref<MediaItem[]>([])
  const loading = ref(true)

  function mapRow(row: any): MediaItem {
    return {
      id: row.id,
      kind: row.kind,
      url: row.url,
      title: row.title || '',
      description: '',
      date: row.date || '',
    }
  }

  async function fetchAll() {
    loading.value = true
    const { data, error } = await supabase
      .from('media')
      .select('*')
      .order('created_at', { ascending: false })
    if (!error && data) media.value = data.map(mapRow)
    loading.value = false
  }

  /** 上传文件到 Supabase Storage，返回公链（图片自动压缩） */
  async function uploadFile(file: File): Promise<{ url: string; kind: 'image' | 'video' }> {
    const kind = file.type.startsWith('video') ? 'video' : 'image'
    // 图片上传前自动压缩（视频原样）
    const finalFile = kind === 'image' ? await compressImage(file) : file
    const ext = finalFile.name.split('.').pop() || 'bin'
    const path = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`
    const { error } = await supabase.storage.from('media').upload(path, finalFile, {
      cacheControl: '3600',
      upsert: false,
    })
    if (error) throw error
    const { data } = supabase.storage.from('media').getPublicUrl(path)
    return { url: data.publicUrl, kind }
  }

  async function addItem(item: Omit<MediaItem, 'id'>) {
    const { error } = await supabase.from('media').insert({
      kind: item.kind,
      url: item.url,
      title: item.title || null,
      date: item.date || null,
    })
    if (error) throw error
  }

  async function updateItem(id: string, patch: Partial<MediaItem>) {
    // 若更换了文件（url 变化），清理被替换掉的旧 Storage 文件
    const prev = media.value.find((m) => m.id === id)
    const { error } = await supabase
      .from('media')
      .update({
        kind: patch.kind,
        url: patch.url,
        title: patch.title || null,
        date: patch.date || null,
      })
      .eq('id', id)
    if (error) throw error
    if (prev && patch.url && patch.url !== prev.url) {
      const oldPath = extractStoragePath(prev.url)
      if (oldPath) {
        const { error: storageErr } = await supabase.storage.from('media').remove([oldPath])
        if (storageErr) console.warn('[useMedia] 清理旧 Storage 文件失败：', storageErr.message)
      }
    }
  }

  /** 从 Supabase Storage 公链中解析出 bucket 内的文件路径；非本站存储返回 null */
  function extractStoragePath(url: string): string | null {
    // 公链格式：.../storage/v1/object/public/media/<path>
    const marker = '/storage/v1/object/public/media/'
    const idx = url.indexOf(marker)
    if (idx === -1) return null
    return decodeURIComponent(url.slice(idx + marker.length))
  }

  async function removeItem(id: string) {
    // 删行前先拿到 url，以便清理 Storage 里的实际文件，避免空间泄漏
    const target = media.value.find((m) => m.id === id)
    const { error } = await supabase.from('media').delete().eq('id', id)
    if (error) throw error
    // 仅清理本站 Storage 内的文件（外链不处理）
    const path = target ? extractStoragePath(target.url) : null
    if (path) {
      // 删文件失败不阻断主流程，记录到控制台即可
      const { error: storageErr } = await supabase.storage.from('media').remove([path])
      if (storageErr) console.warn('[useMedia] 清理 Storage 文件失败：', storageErr.message)
    }
  }

  // 实时同步（每个实例用唯一频道名，避免重复订阅同名频道导致报错）
  let channel: any = null
  onMounted(() => {
    fetchAll()
    const channelName = `media-changes-${Math.random().toString(36).slice(2, 9)}`
    channel = supabase
      .channel(channelName)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'media' }, () => fetchAll())
      .subscribe()
  })
  onUnmounted(() => {
    if (channel) supabase.removeChannel(channel)
  })

  return { media, loading, addItem, updateItem, removeItem, uploadFile }
}
