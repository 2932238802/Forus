import { ref, onMounted, onUnmounted } from 'vue'
import { useSupabaseClient } from '#imports'
import type { IdentityKey } from '~/composables/useIdentity'

/**
 * Adore!! —— 记录「对方的优点 / 很喜欢对方的地方」，用于加固喜欢。
 * owner：这条优点记在谁身上（通常是「对方」）。
 */
export interface Adore {
  id: string
  owner: IdentityKey // 谁（you / npy）
  text: string
  at: number
}

export function useAdores() {
  const supabase = useSupabaseClient()
  const adores = ref<Adore[]>([])

  function mapRow(r: any): Adore {
    return {
      id: r.id,
      owner: (r.owner === 'you' || r.owner === 'npy') ? r.owner : 'npy',
      text: r.text,
      at: new Date(r.created_at).getTime(),
    }
  }

  async function fetchAll() {
    const { data, error } = await supabase
      .from('adores')
      .select('*')
      .order('created_at', { ascending: false })
    if (!error && data) adores.value = data.map(mapRow)
  }

  async function addAdore(owner: IdentityKey, text: string) {
    if (!text.trim()) return
    const { error } = await supabase.from('adores').insert({ owner, text: text.trim() })
    if (error) throw error
  }

  async function updateAdore(id: string, patch: Partial<Pick<Adore, 'text'>>) {
    const body: any = {}
    if (patch.text !== undefined) body.text = patch.text.trim()
    const { error } = await supabase.from('adores').update(body).eq('id', id)
    if (error) throw error
  }

  async function removeAdore(id: string) {
    await supabase.from('adores').delete().eq('id', id)
  }

  let channel: any = null
  onMounted(() => {
    fetchAll()
    const name = `adores-changes-${Math.random().toString(36).slice(2, 9)}`
    channel = supabase
      .channel(name)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'adores' }, () => fetchAll())
      .subscribe()
  })
  onUnmounted(() => {
    if (channel) supabase.removeChannel(channel)
  })

  return { adores, addAdore, updateAdore, removeAdore }
}
