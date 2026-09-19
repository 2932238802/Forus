import { ref, onMounted, onUnmounted } from 'vue'
import { useSupabaseClient } from '#imports'
import type { IdentityKey } from '~/composables/useIdentity'

export interface Dislike {
  id: string
  owner: IdentityKey
  text: string
  at: number
}

export function useDislikes() {
  const supabase = useSupabaseClient()
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
  }

  async function updateDislike(id: string, text: string) {
    if (!text.trim()) return
    const { error } = await supabase
      .from('dislikes')
      .update({ text: text.trim() })
      .eq('id', id)
    if (error) throw error
  }

  async function removeDislike(id: string) {
    const { error } = await supabase.from('dislikes').delete().eq('id', id)
    if (error) throw error
  }

  let channel: any = null
  onMounted(() => {
    fetchAll()
    const channelName = `dislikes-changes-${Math.random().toString(36).slice(2, 9)}`
    channel = supabase
      .channel(channelName)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'dislikes' }, () => fetchAll())
      .subscribe()
  })

  onUnmounted(() => {
    if (channel) supabase.removeChannel(channel)
  })

  return { dislikes, addDislike, updateDislike, removeDislike }
}
