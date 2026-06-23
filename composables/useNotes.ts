import { ref, onMounted, onUnmounted } from 'vue'
import { useSupabaseClient } from '#imports'

export interface Note {
  id: string
  author: string
  text: string
  at: number
}

export function useNotes() {
  const supabase = useSupabaseClient()
  const notes = ref<Note[]>([])

  function mapRow(row: any): Note {
    return {
      id: row.id,
      author: row.author,
      text: row.text,
      at: new Date(row.created_at).getTime(),
    }
  }

  async function fetchAll() {
    const { data, error } = await supabase
      .from('notes')
      .select('*')
      .order('created_at', { ascending: false })
    if (!error && data) notes.value = data.map(mapRow)
  }

  async function addNote(author: string, text: string) {
    if (!text.trim()) return
    await supabase.from('notes').insert({ author, text: text.trim() })
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

  return { notes, addNote, removeNote }
}
