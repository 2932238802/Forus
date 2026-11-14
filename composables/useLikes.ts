import { ref } from 'vue'
import { useDb } from '~/composables/useDb'
import type { IdentityKey } from '~/composables/useIdentity'
import { usePolling } from '~/composables/usePolling'

export type LikeKind = 'like' | 'dislike'
export type LikeCategory = 'food' | 'behavior' | 'thing' | 'other'

export interface Like {
  id: string
  owner: IdentityKey // 谁（you / npy）
  kind: LikeKind // 喜欢 / 不喜欢
  category: LikeCategory // 分类
  text: string
  at: number
}

/** 分类元信息（顺序即 Tab 顺序） */
export const CATEGORIES: { key: LikeCategory; label: string; emoji: string }[] = [
  { key: 'food', label: '食物', emoji: '🍔' },
  { key: 'behavior', label: '行为', emoji: '🫶' },
  { key: 'thing', label: '物品', emoji: '📦' },
  { key: 'other', label: '其他', emoji: '✨' },
]

export function useLikes() {
  const supabase = useDb()
  const likes = ref<Like[]>([])

  function mapRow(r: any): Like {
    return {
      id: r.id,
      owner: (r.owner === 'you' || r.owner === 'npy') ? r.owner : 'npy',
      kind: r.kind === 'dislike' ? 'dislike' : 'like',
      category: ['food', 'behavior', 'thing', 'other'].includes(r.category) ? r.category : 'other',
      text: r.text,
      at: new Date(r.created_at).getTime(),
    }
  }

  async function fetchAll() {
    const { data, error } = await supabase
      .from('likes')
      .select('*')
      .order('created_at', { ascending: false })
    if (!error && data) likes.value = data.map(mapRow)
  }

  async function addLike(
    owner: IdentityKey,
    kind: LikeKind,
    category: LikeCategory,
    text: string,
  ) {
    if (!text.trim()) return
    const { error } = await supabase
      .from('likes')
      .insert({ owner, kind, category, text: text.trim() })
    if (error) throw error
    await fetchAll()
  }

  /** 通用更新（拖拽换喜欢/不喜欢栏 → 改 kind；换分类 → 改 category） */
  async function updateLike(
    id: string,
    patch: Partial<Pick<Like, 'kind' | 'category' | 'text'>>,
  ) {
    const { error } = await supabase.from('likes').update(patch).eq('id', id)
    if (error) throw error
    await fetchAll()
  }

  async function removeLike(id: string) {
    const { error } = await supabase.from('likes').delete().eq('id', id)
    if (error) throw error
    await fetchAll()
  }

  usePolling(fetchAll)

  return { likes, addLike, updateLike, removeLike }
}
