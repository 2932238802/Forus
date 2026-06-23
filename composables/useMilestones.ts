import { ref, onMounted, onUnmounted } from 'vue'
import { useSupabaseClient } from '#imports'
import type { Milestone } from '~/types'

export function useMilestones() {
  const supabase = useSupabaseClient()
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
    await supabase.from('milestones').insert({
      title: m.title,
      date: m.date,
      type: m.type,
      emoji: m.emoji || '🤍',
    })
  }

  async function updateMilestone(id: string, m: Partial<Omit<Milestone, 'id' | 'description'>>) {
    await supabase
      .from('milestones')
      .update({
        title: m.title,
        date: m.date,
        type: m.type,
        emoji: m.emoji || '🤍',
      })
      .eq('id', id)
  }

  async function removeMilestone(id: string) {
    await supabase.from('milestones').delete().eq('id', id)
  }

  let channel: any = null
  onMounted(() => {
    fetchAll()
    channel = supabase
      .channel('milestones-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'milestones' }, () => fetchAll())
      .subscribe()
  })
  onUnmounted(() => {
    if (channel) supabase.removeChannel(channel)
  })

  return { milestones, addMilestone, updateMilestone, removeMilestone }
}
