import { ref, onMounted, onUnmounted } from 'vue'
import { useSupabaseClient } from '#imports'

export interface Note {
  id: string
  author: string
  kind: 'text' | 'image'
  text: string       // 文字内容（kind=text）或图片说明（可空）
  imageUrl?: string  // 图片地址（kind=image）
  at: number
}

export function useNotes() {
  const supabase = useSupabaseClient()
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
    await supabase.from('notes').insert({ author, kind: 'text', text: text.trim() })
  }

  async function addImage(author: string, imageUrl: string, caption = '') {
    await supabase.from('notes').insert({
      author,
      kind: 'image',
      image_url: imageUrl,
      text: caption,
    })
  }

  async function removeNote(id: string) {
    await supabase.from('notes').delete().eq('id', id)
  }

  let channel: any = null
  onMounted(() => {
    fetchAll()
    channel = supabase
      .channel('notes-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notes' }, () => fetchAll())
      .subscribe()
  })
  onUnmounted(() => {
    if (channel) supabase.removeChannel(channel)
  })

  return { notes, addText, addImage, removeNote }
}
