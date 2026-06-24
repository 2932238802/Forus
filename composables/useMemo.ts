import { ref, onMounted, onUnmounted } from 'vue'
import { useSupabaseClient } from '#imports'

export interface Memo {
  id: string
  text: string
  done: boolean
  at: number
}

export function useMemo() {
  const supabase = useSupabaseClient()
  const memos = ref<Memo[]>([])

  function mapRow(r: any): Memo {
    return { id: r.id, text: r.text, done: !!r.done, at: new Date(r.created_at).getTime() }
  }

  async function fetchAll() {
    const { data, error } = await supabase
      .from('memos')
      .select('*')
      .order('created_at', { ascending: false })
    if (!error && data) memos.value = data.map(mapRow)
  }

  async function addMemo(text: string) {
    if (!text.trim()) return
    await supabase.from('memos').insert({ text: text.trim(), done: false })
  }

  async function toggleMemo(id: string, done: boolean) {
    await supabase.from('memos').update({ done }).eq('id', id)
  }

  async function removeMemo(id: string) {
    await supabase.from('memos').delete().eq('id', id)
  }

  let channel: any = null
  onMounted(() => {
    fetchAll()
    const name = `memos-changes-${Math.random().toString(36).slice(2, 9)}`
    channel = supabase
      .channel(name)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'memos' }, () => fetchAll())
      .subscribe()
  })
  onUnmounted(() => {
    if (channel) supabase.removeChannel(channel)
  })

  return { memos, addMemo, toggleMemo, removeMemo }
}
