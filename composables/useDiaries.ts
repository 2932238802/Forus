import { ref, onMounted, onUnmounted } from 'vue'
import { useSupabaseClient } from '#imports'
import type { IdentityKey } from '~/composables/useIdentity'

export interface Diary {
  id: string
  owner: IdentityKey
  happenedOn: string
  title: string
  content: string
  mood: string
  imageUrl: string
  at: number
}

export function useDiaries() {
  const supabase = useSupabaseClient()
  const diaries = ref<Diary[]>([])

  function mapRow(row: any): Diary {
    return {
      id: row.id,
      owner: row.owner === 'you' ? 'you' : 'npy',
      happenedOn: row.happened_on,
      title: row.title || '',
      content: row.content || '',
      mood: row.mood || '🤍',
      imageUrl: row.image_url || '',
      at: new Date(row.created_at).getTime(),
    }
  }

  async function fetchAll() {
    const { data, error } = await supabase
      .from('diaries')
      .select('*')
      .order('happened_on', { ascending: false })
      .order('created_at', { ascending: false })
    if (error) throw error
    diaries.value = (data || []).map(mapRow)
  }

  async function addDiary(input: Omit<Diary, 'id' | 'at'>) {
    const { error } = await supabase.from('diaries').insert({
      owner: input.owner,
      happened_on: input.happenedOn,
      title: input.title.trim(),
      content: input.content.trim(),
      mood: input.mood,
      image_url: input.imageUrl.trim() || null,
    })
    if (error) throw error
  }

  async function updateDiary(id: string, input: Omit<Diary, 'id' | 'at'>) {
    const { error } = await supabase.from('diaries').update({
      happened_on: input.happenedOn,
      title: input.title.trim(),
      content: input.content.trim(),
      mood: input.mood,
      image_url: input.imageUrl.trim() || null,
    }).eq('id', id)
    if (error) throw error
  }

  async function removeDiary(id: string) {
    const { error } = await supabase.from('diaries').delete().eq('id', id)
    if (error) throw error
  }

  let channel: any = null
  onMounted(() => {
    fetchAll().catch((error) => console.error('[useDiaries] 拉取失败：', error))
    const name = `diaries-changes-${Math.random().toString(36).slice(2, 9)}`
    channel = supabase
      .channel(name)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'diaries' }, () => {
        fetchAll().catch((error) => console.error('[useDiaries] 同步失败：', error))
      })
      .subscribe()
  })
  onUnmounted(() => {
    if (channel) supabase.removeChannel(channel)
  })

  return { diaries, addDiary, updateDiary, removeDiary }
}
