import { ref, onMounted, onUnmounted } from 'vue'
import { useSupabaseClient } from '#imports'
import type { IdentityKey } from '~/composables/useIdentity'

export interface Letter {
  id: string
  whoFrom: IdentityKey
  whoTo: IdentityKey
  title: string
  content: string
  unlockDate: string // YYYY-MM-DD
  at: number
}

export function useLetters() {
  const supabase = useSupabaseClient()
  const letters = ref<Letter[]>([])

  function mapRow(r: any): Letter {
    return {
      id: r.id,
      whoFrom: (r.who_from === 'you' || r.who_from === 'npy') ? r.who_from : 'npy',
      whoTo: (r.who_to === 'you' || r.who_to === 'npy') ? r.who_to : 'you',
      title: r.title || '',
      content: r.content || '',
      unlockDate: r.unlock_date,
      at: new Date(r.created_at).getTime(),
    }
  }

  async function fetchAll() {
    const { data, error } = await supabase
      .from('letters')
      .select('*')
      .order('unlock_date', { ascending: true })
    if (!error && data) letters.value = data.map(mapRow)
  }

  /** 写一封信：from 写给 to */
  async function sendLetter(
    from: IdentityKey,
    to: IdentityKey,
    title: string,
    content: string,
    unlockDate: string,
  ) {
    if (!content.trim() || !unlockDate) return
    const { error } = await supabase.from('letters').insert({
      who_from: from,
      who_to: to,
      title: title.trim(),
      content: content.trim(),
      unlock_date: unlockDate,
    })
    if (error) throw error
  }

  /** 重新编辑信（仅未到期时调用，由页面控制） */
  async function updateLetter(
    id: string,
    patch: { title?: string; content?: string; unlockDate?: string },
  ) {
    const body: any = {}
    if (patch.title !== undefined) body.title = patch.title.trim()
    if (patch.content !== undefined) body.content = patch.content.trim()
    if (patch.unlockDate !== undefined) body.unlock_date = patch.unlockDate
    const { error } = await supabase.from('letters').update(body).eq('id', id)
    if (error) throw error
  }

  async function removeLetter(id: string) {
    await supabase.from('letters').delete().eq('id', id)
  }

  let channel: any = null
  onMounted(() => {
    fetchAll()
    const name = `letters-changes-${Math.random().toString(36).slice(2, 9)}`
    channel = supabase
      .channel(name)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'letters' }, () => fetchAll())
      .subscribe()
  })
  onUnmounted(() => {
    if (channel) supabase.removeChannel(channel)
  })

  return { letters, sendLetter, updateLetter, removeLetter }
}

/** 这封信是否已到解锁日期（今天 >= unlockDate） */
export function isUnlocked(unlockDate: string): boolean {
  const unlock = new Date(unlockDate + 'T00:00:00').getTime()
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
  return today >= unlock
}

/** 距解锁还有多少天（已解锁返回 0） */
export function daysToUnlock(unlockDate: string): number {
  const unlock = new Date(unlockDate + 'T00:00:00').getTime()
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
  return Math.max(0, Math.ceil((unlock - today) / 86400000))
}
