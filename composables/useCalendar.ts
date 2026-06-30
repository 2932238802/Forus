import { ref, onMounted, onUnmounted } from 'vue'
import { useSupabaseClient } from '#imports'

export interface CalMark {
  id: string
  date: string // YYYY-MM-DD
  text: string
  at: number
}

export function useCalendar() {
  const supabase = useSupabaseClient()
  const marks = ref<CalMark[]>([])

  function mapRow(r: any): CalMark {
    return { id: r.id, date: r.date, text: r.text || '', at: new Date(r.created_at).getTime() }
  }

  async function fetchAll() {
    const { data, error } = await supabase
      .from('calendar_marks')
      .select('*')
      .order('date', { ascending: true })
    if (!error && data) marks.value = data.map(mapRow)
  }

  /** 取某天的备注（没有返回 null） */
  function byDate(date: string): CalMark | null {
    return marks.value.find((m) => m.date === date) || null
  }

  /** 设置某天备注：有则更新，无则新增（文本为空则删除该天备注） */
  async function setMark(date: string, text: string) {
    const t = text.trim()
    const existing = byDate(date)
    if (!t) {
      // 清空 = 删除
      if (existing) await supabase.from('calendar_marks').delete().eq('id', existing.id)
      return
    }
    if (existing) {
      const { error } = await supabase.from('calendar_marks').update({ text: t }).eq('id', existing.id)
      if (error) throw error
    } else {
      const { error } = await supabase.from('calendar_marks').insert({ date, text: t })
      if (error) throw error
    }
  }

  let channel: any = null
  onMounted(() => {
    fetchAll()
    const name = `calendar-changes-${Math.random().toString(36).slice(2, 9)}`
    channel = supabase
      .channel(name)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'calendar_marks' }, () => fetchAll())
      .subscribe()
  })
  onUnmounted(() => {
    if (channel) supabase.removeChannel(channel)
  })

  return { marks, byDate, setMark }
}
