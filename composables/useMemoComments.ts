import { ref, onMounted, onUnmounted } from 'vue'
import { useSupabaseClient } from '#imports'
import type { IdentityKey } from '~/composables/useIdentity'

export interface MemoComment {
  id: string
  memoId: string
  author: IdentityKey
  text: string
  at: number
}

export function useMemoComments() {
  const supabase = useSupabaseClient()
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
  }

  async function removeComment(id: string) {
    await supabase.from('memo_comments').delete().eq('id', id)
  }

  let channel: any = null
  onMounted(() => {
    fetchAll()
    const name = `memo-comments-${Math.random().toString(36).slice(2, 9)}`
    channel = supabase
      .channel(name)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'memo_comments' }, () => fetchAll())
      .subscribe()
  })
  onUnmounted(() => {
    if (channel) supabase.removeChannel(channel)
  })

  return { comments, byMemo, addComment, removeComment }
}
