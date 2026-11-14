import { ref } from 'vue'
import { useDb } from '~/composables/useDb'
import type { IdentityKey } from '~/composables/useIdentity'
import { usePolling } from '~/composables/usePolling'

export interface MemoComment {
  id: string
  memoId: string
  author: IdentityKey
  text: string
  at: number
}

export function useMemoComments() {
  const supabase = useDb()
  // 所有评论（前端按 memoId 分组）
  const comments = ref<MemoComment[]>([])

  function mapRow(r: any): MemoComment {
    return {
      id: r.id,
      memoId: r.memo_id,
      author: (r.author === 'you' || r.author === 'npy') ? r.author : 'npy',
      text: r.text,
      at: new Date(r.created_at).getTime(),
    }
  }

  async function fetchAll() {
    const { data, error } = await supabase
      .from('memo_comments')
      .select('*')
      .order('created_at', { ascending: true })
    if (!error && data) comments.value = data.map(mapRow)
  }

  /** 取某条备忘录的评论 */
  function byMemo(memoId: string): MemoComment[] {
    return comments.value.filter((c) => c.memoId === memoId)
  }

  async function addComment(memoId: string, author: IdentityKey, text: string) {
    if (!text.trim()) return
    const { error } = await supabase
      .from('memo_comments')
      .insert({ memo_id: memoId, author, text: text.trim() })
    if (error) throw error
    await fetchAll()
  }

  async function removeComment(id: string) {
    const { error } = await supabase.from('memo_comments').delete().eq('id', id)
    if (error) throw error
    await fetchAll()
  }

  usePolling(fetchAll)

  return { comments, byMemo, addComment, removeComment }
}
