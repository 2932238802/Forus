import { ref, onMounted, onUnmounted } from 'vue'
import { useSupabaseClient } from '#imports'
import type { IdentityKey } from '~/composables/useIdentity'

export interface Memo {
  id: string
  owner: IdentityKey // 这条备忘录是谁的
  text: string
  done: boolean
  at: number
}

export function useMemo() {
  const supabase = useSupabaseClient()
  const memos = ref<Memo[]>([])

  function mapRow(r: any): Memo {
    return {
      id: r.id,
      owner: (r.owner === 'you' || r.owner === 'npy') ? r.owner : 'npy',
      text: r.text,
      done: !!r.done,
      at: new Date(r.created_at).getTime(),
    }
  }

  async function fetchAll() {
    const { data, error } = await supabase
      .from('memos')
      .select('*')
      .order('created_at', { ascending: false })
    if (!error && data) memos.value = data.map(mapRow)
  }

  /** 新增一条备忘录到指定人名下 */
  async function addMemo(owner: IdentityKey, text: string) {
    if (!text.trim()) return
    await supabase.from('memos').insert({ owner, text: text.trim(), done: false })
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
    const channelName = `memos-changes-${Math.random().toString(36).slice(2, 9)}`
    channel = supabase
      .channel(channelName)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'memos' }, () => fetchAll())
      .subscribe()
  })
  onUnmounted(() => {
    if (channel) supabase.removeChannel(channel)
  })

  return { memos, addMemo, toggleMemo, removeMemo }
}
