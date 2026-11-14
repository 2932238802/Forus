import { ref } from 'vue'
import { useDb } from '~/composables/useDb'
import { usePolling } from '~/composables/usePolling'

export interface CalMark {
  id: string
  date: string // YYYY-MM-DD
  text: string
  at: number
}

export function useCalendar() {
  const supabase = useDb()
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
      if (existing) {
        const { error } = await supabase
          .from('calendar_marks')
          .delete()
          .eq('id', existing.id)
        if (error) throw error
        await fetchAll()
      }
      return
    }
    if (existing) {
      const { error } = await supabase.from('calendar_marks').update({ text: t }).eq('id', existing.id)
      if (error) throw error
    } else {
      const { error } = await supabase.from('calendar_marks').insert({ date, text: t })
      if (error) throw error
    }
    await fetchAll()
  }

  usePolling(fetchAll)

  return { marks, byDate, setMark }
}
