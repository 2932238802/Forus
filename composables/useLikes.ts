import { ref, onMounted, onUnmounted } from 'vue'
import { useSupabaseClient } from '#imports'

export interface Like {
  id: string
  owner: string         // 谁（在野 / LosAngelous）
  kind: 'like' | 'dislike' // 喜欢 / 不喜欢
  text: string
  at: number
}

export function useLikes() {
  const supabase = useSupabaseClient()
  const likes = ref<Like[]>([])

  function mapRow(r: any): Like {
    return {
      id: r.id,
      owner: r.owner,
      kind: r.kind || 'like',
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

  async function addLike(owner: string, kind: 'like' | 'dislike', text: string) {
    if (!text.trim()) return
    await supabase.from('likes').insert({ owner, kind, text: text.trim() })
  }

  async function removeLike(id: string) {
    await supabase.from('likes').delete().eq('id', id)
  }

  let channel: any = null
  onMounted(() => {
    fetchAll()
    const name = `likes-changes-${Math.random().toString(36).slice(2, 9)}`
    channel = supabase
      .channel(name)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'likes' }, () => fetchAll())
      .subscribe()
  })
  onUnmounted(() => {
    if (channel) supabase.removeChannel(channel)
  })

  return { likes, addLike, removeLike }
}
