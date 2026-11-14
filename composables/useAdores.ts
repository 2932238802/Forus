import { ref } from 'vue'
import { useDb } from '~/composables/useDb'
import type { IdentityKey } from '~/composables/useIdentity'
import { usePolling } from '~/composables/usePolling'

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
  const supabase = useDb()
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
    await fetchAll()
  }

  async function updateAdore(id: string, patch: Partial<Pick<Adore, 'text'>>) {
    const body: any = {}
    if (patch.text !== undefined) body.text = patch.text.trim()
    const { error } = await supabase.from('adores').update(body).eq('id', id)
    if (error) throw error
    await fetchAll()
  }

  async function removeAdore(id: string) {
    const { error } = await supabase.from('adores').delete().eq('id', id)
    if (error) throw error
    await fetchAll()
  }

  usePolling(fetchAll)

  return { adores, addAdore, updateAdore, removeAdore }
}
