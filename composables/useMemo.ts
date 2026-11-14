import { ref } from 'vue'
import { useDb } from '~/composables/useDb'
import type { IdentityKey } from '~/composables/useIdentity'
import { usePolling } from '~/composables/usePolling'

export interface Memo {
  id: string
  owner: IdentityKey // 这条备忘录是谁的
  text: string
  done: boolean
  at: number
}

export function useMemo() {
  const supabase = useDb()
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
    const { error } = await supabase
      .from('memos')
      .insert({ owner, text: text.trim(), done: false })
    if (error) throw error
    await fetchAll()
  }

  async function toggleMemo(id: string, done: boolean) {
    const { error } = await supabase.from('memos').update({ done }).eq('id', id)
    if (error) throw error
    await fetchAll()
  }

  /** 修改备忘录文字内容 */
  async function updateMemoText(id: string, text: string) {
    if (!text.trim()) return
    const { error } = await supabase
      .from('memos')
      .update({ text: text.trim() })
      .eq('id', id)
    if (error) throw error
    await fetchAll()
  }

  async function removeMemo(id: string) {
    const { error } = await supabase.from('memos').delete().eq('id', id)
    if (error) throw error
    await fetchAll()
  }

  usePolling(fetchAll)

  return { memos, addMemo, toggleMemo, updateMemoText, removeMemo }
}
