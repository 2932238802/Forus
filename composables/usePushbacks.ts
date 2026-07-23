import { ref, onMounted, onUnmounted } from 'vue'
import { useSupabaseClient } from '#imports'
import type { IdentityKey } from '~/composables/useIdentity'

export interface Pushback {
  id: string
  text: string
  note: string
  owner: IdentityKey
  at: number
}

export function usePushbacks() {
  const supabase = useSupabaseClient()
  const pushbacks = ref<Pushback[]>([])

  function mapRow(r: any): Pushback {
    return {
      id: r.id,
      text: r.text,
      note: r.note || '',
      owner: (r.owner === 'you' || r.owner === 'npy') ? r.owner : 'you',
      at: new Date(r.created_at).getTime(),
    }
  }

  async function fetchAll() {
    const { data, error } = await supabase
      .from('pushbacks')
      .select('*')
      .order('created_at', { ascending: false })
    if (!error && data) pushbacks.value = data.map(mapRow)
  }

  async function addPushback(owner: IdentityKey, text: string, note: string) {
    if (!text.trim()) return
    await supabase.from('pushbacks').insert({
      owner,
      text: text.trim(),
      note: note.trim() || null,
    })
  }

  async function updatePushback(id: string, patch: Partial<Pick<Pushback, 'text' | 'note'>>) {
    const body: any = {}
    if (patch.text !== undefined) body.text = patch.text.trim()
    if (patch.note !== undefined) body.note = patch.note.trim() || null
    await supabase.from('pushbacks').update(body).eq('id', id)
  }

  async function removePushback(id: string) {
    await supabase.from('pushbacks').delete().eq('id', id)
  }

  let channel: any = null
  onMounted(() => {
    fetchAll()
    const name = `pushbacks-changes-${Math.random().toString(36).slice(2, 9)}`
    channel = supabase
      .channel(name)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pushbacks' }, () => fetchAll())
      .subscribe()
  })
  onUnmounted(() => {
    if (channel) supabase.removeChannel(channel)
  })

  return { pushbacks, addPushback, updatePushback, removePushback }
}
