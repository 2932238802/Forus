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

  /** 上传文件到 Supabase Storage，返回公链 */
  async function uploadFile(file: File): Promise<{ url: string; kind: 'image' | 'video' }> {
    const kind = file.type.startsWith('video') ? 'video' : 'image'
    const ext = file.name.split('.').pop() || 'bin'
    const path = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`
    const { error } = await supabase.storage.from('media').upload(path, file, {
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
  }

  async function removeItem(id: string) {
    await supabase.from('media').delete().eq('id', id)
  }

  // 实时同步
  let channel: any = null
  onMounted(() => {
    fetchAll()
    channel = supabase
      .channel('media-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'media' }, () => fetchAll())
      .subscribe()
  })
  onUnmounted(() => {
    if (channel) supabase.removeChannel(channel)
  })

  return { media, loading, addItem, updateItem, removeItem, uploadFile }
}
