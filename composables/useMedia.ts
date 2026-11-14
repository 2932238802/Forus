import { ref, onMounted, onUnmounted } from 'vue'
import { useDb } from '~/composables/useDb'
import type { MediaItem } from '~/types'
import { useMediaUpload } from '~/composables/useMediaUpload'

export function useMedia() {
  const supabase = useDb()
  const { upload, removeUrl } = useMediaUpload()
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
      .order('created_at', { ascending: true })
    if (!error && data) media.value = data.map(mapRow)
    loading.value = false
  }

  /** 上传文件到 Supabase Storage，返回公链（图片自动压缩） */
  async function uploadFile(file: File): Promise<{ url: string; kind: 'image' | 'video' }> {
    const { url, kind } = await upload(file)
    return { url, kind }
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
      try {
        await removeUrl(prev.url)
      } catch (err) {
        console.warn('[useMedia] 清理旧 Storage 文件失败：', err)
      }
    }
  }

  async function removeItem(id: string) {
    // 删行前先拿到 url，以便清理 Storage 里的实际文件，避免空间泄漏
    const target = media.value.find((m) => m.id === id)
    const { error } = await supabase.from('media').delete().eq('id', id)
    if (error) throw error
    // 仅清理本站 Storage 内的文件（外链自动忽略）；失败不阻断主流程
    if (target?.url) {
      try {
        await removeUrl(target.url)
      } catch (err) {
        console.warn('[useMedia] 清理 Storage 文件失败：', err)
      }
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
