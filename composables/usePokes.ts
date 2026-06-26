import { useSupabaseClient } from '#imports'
import type { IdentityKey } from '~/composables/useIdentity'

export interface Poke {
  id: string
  whoFrom: IdentityKey
  whoTo: IdentityKey
  message: string
  seen: boolean
  at: number
}

export function usePokes() {
  const supabase = useSupabaseClient()

  function mapRow(r: any): Poke {
    return {
      id: r.id,
      whoFrom: r.who_from,
      whoTo: r.who_to,
      message: r.message || '',
      seen: !!r.seen,
      at: new Date(r.created_at).getTime(),
    }
  }

  /** 发送一次「想你了」：from 戳给 to */
  async function sendPoke(from: IdentityKey, to: IdentityKey, message = '') {
    const { error } = await supabase
      .from('pokes')
      .insert({ who_from: from, who_to: to, message })
    if (error) throw error
  }

  /** 查询「想我的、还没看过的」poke（me 是当前身份），按时间正序 */
  async function fetchUnseen(me: IdentityKey): Promise<Poke[]> {
    const { data, error } = await supabase
      .from('pokes')
      .select('*')
      .eq('who_to', me)
      .eq('seen', false)
      .order('created_at', { ascending: true })
    if (error || !data) return []
    return data.map(mapRow)
  }

  /** 把若干 poke 标记为已读 */
  async function markSeen(ids: string[]) {
    if (!ids.length) return
    await supabase.from('pokes').update({ seen: true }).in('id', ids)
  }

  return { sendPoke, fetchUnseen, markSeen }
}
