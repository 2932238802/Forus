import { ref } from 'vue'
import { useDb } from '~/composables/useDb'
import type { IdentityKey } from '~/composables/useIdentity'
import { usePolling } from '~/composables/usePolling'

export interface Dislike {
  id: string
  owner: IdentityKey
  text: string
  at: number
}

export function useDislikes() {
  const supabase = useDb()
  const dislikes = ref<Dislike[]>([])

  function mapRow(row: any): Dislike {
    return {
      id: row.id,
      owner: row.owner === 'you' || row.owner === 'npy' ? row.owner : 'npy',
      text: row.text || '',
      at: new Date(row.created_at).getTime(),
    }
  }

  async function fetchAll() {
    const { data, error } = await supabase
      .from('dislikes')
      .select('*')
      .order('created_at', { ascending: false })
    if (!error && data) dislikes.value = data.map(mapRow)
  }

  async function addDislike(owner: IdentityKey, text: string) {
    if (!text.trim()) return
    const { error } = await supabase.from('dislikes').insert({ owner, text: text.trim() })
    if (error) throw error
    await fetchAll()
  }

  async function updateDislike(id: string, text: string) {
    if (!text.trim()) return
    const { error } = await supabase
      .from('dislikes')
      .update({ text: text.trim() })
      .eq('id', id)
    if (error) throw error
    await fetchAll()
  }

  async function removeDislike(id: string) {
    const { error } = await supabase.from('dislikes').delete().eq('id', id)
    if (error) throw error
    await fetchAll()
  }

  usePolling(fetchAll)

  return { dislikes, addDislike, updateDislike, removeDislike }
}
