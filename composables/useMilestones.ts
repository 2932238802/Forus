import { ref } from 'vue'
import { useDb } from '~/composables/useDb'
import type { Milestone } from '~/types'
import { usePolling } from '~/composables/usePolling'

export function useMilestones() {
  const supabase = useDb()
  const milestones = ref<Milestone[]>([])

  function mapRow(row: any): Milestone {
    return {
      id: row.id,
      title: row.title,
      description: '',
      date: row.date,
      type: row.type,
      emoji: row.emoji || '🤍',
    }
  }

  async function fetchAll() {
    const { data, error } = await supabase
      .from('milestones')
      .select('*')
      .order('date', { ascending: true })
    if (!error && data) milestones.value = data.map(mapRow)
  }

  async function addMilestone(m: Omit<Milestone, 'id' | 'description'>) {
    const { error } = await supabase.from('milestones').insert({
      title: m.title,
      date: m.date,
      type: m.type,
      emoji: m.emoji || '🤍',
    })
    if (error) throw error
    await fetchAll()
  }

  async function updateMilestone(id: string, m: Partial<Omit<Milestone, 'id' | 'description'>>) {
    const { error } = await supabase
      .from('milestones')
      .update({
        title: m.title,
        date: m.date,
        type: m.type,
        emoji: m.emoji || '🤍',
      })
      .eq('id', id)
    if (error) throw error
    await fetchAll()
  }

  async function removeMilestone(id: string) {
    const { error } = await supabase.from('milestones').delete().eq('id', id)
    if (error) throw error
    await fetchAll()
  }

  usePolling(fetchAll)

  return { milestones, addMilestone, updateMilestone, removeMilestone }
}
