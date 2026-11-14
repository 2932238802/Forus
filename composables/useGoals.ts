import { ref, onMounted, onUnmounted } from 'vue'
import { useDb } from '~/composables/useDb'

export interface Goal {
  id: string
  title: string
  done: boolean
  at: number
}

export function useGoals() {
  const supabase = useDb()
  const goals = ref<Goal[]>([])

  function mapRow(r: any): Goal {
    return { id: r.id, title: r.title, done: !!r.done, at: new Date(r.created_at).getTime() }
  }

  async function fetchAll() {
    const { data, error } = await supabase
      .from('goals')
      .select('*')
      .order('created_at', { ascending: false })
    if (!error && data) goals.value = data.map(mapRow)
  }

  async function addGoal(title: string) {
    if (!title.trim()) return
    const { error } = await supabase
      .from('goals')
      .insert({ title: title.trim(), done: false })
    if (error) throw error
  }

  async function toggleGoal(id: string, done: boolean) {
    const { error } = await supabase.from('goals').update({ done }).eq('id', id)
    if (error) throw error
  }

  async function removeGoal(id: string) {
    const { error } = await supabase.from('goals').delete().eq('id', id)
    if (error) throw error
  }

  let channel: any = null
  onMounted(() => {
    fetchAll()
    const name = `goals-changes-${Math.random().toString(36).slice(2, 9)}`
    channel = supabase
      .channel(name)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'goals' }, () => fetchAll())
      .subscribe()
  })
  onUnmounted(() => {
    if (channel) supabase.removeChannel(channel)
  })

  return { goals, addGoal, toggleGoal, removeGoal }
}
