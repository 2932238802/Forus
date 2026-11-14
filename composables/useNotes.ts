import { ref } from 'vue'
import { useDb } from '~/composables/useDb'
import { useMediaUpload } from '~/composables/useMediaUpload'
import { usePolling } from '~/composables/usePolling'

export interface Note {
  id: string
  author: string
  kind: 'text' | 'image'
  text: string       // 文字内容（kind=text）或图片说明（可空）
  imageUrl?: string  // 图片地址（kind=image）
  at: number
}

export function useNotes() {
  const supabase = useDb()
  const { removeUrl } = useMediaUpload()
  const notes = ref<Note[]>([])

  function mapRow(row: any): Note {
    return {
      id: row.id,
      author: row.author,
      kind: row.kind || 'text',
      text: row.text || '',
      imageUrl: row.image_url || undefined,
      at: new Date(row.created_at).getTime(),
    }
  }

  async function fetchAll() {
    const { data, error } = await supabase
      .from('notes')
      .select('*')
      .order('created_at', { ascending: true }) // 聊天：时间正序，新消息在下
    if (!error && data) notes.value = data.map(mapRow)
  }

  async function addText(author: string, text: string) {
    if (!text.trim()) return
    const { error } = await supabase
      .from('notes')
      .insert({ author, kind: 'text', text: text.trim() })
    if (error) throw error
    await fetchAll()
  }

  async function addImage(author: string, imageUrl: string, caption = '') {
    const { error } = await supabase.from('notes').insert({
      author,
      kind: 'image',
      image_url: imageUrl,
      text: caption,
    })
    if (error) throw error
    await fetchAll()
  }

  async function removeNote(id: string) {
    const target = notes.value.find((n) => n.id === id)
    const { error } = await supabase.from('notes').delete().eq('id', id)
    if (error) throw error
    await fetchAll()
    // 图片消息同时清理本地文件，避免文件永久残留
    if (target?.kind === 'image' && target.imageUrl) {
      try {
        await removeUrl(target.imageUrl)
      } catch (err) {
        console.warn('[useNotes] 清理图片失败：', err)
      }
    }
  }

  usePolling(fetchAll)

  return { notes, addText, addImage, removeNote }
}
