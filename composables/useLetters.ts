import { ref, watch } from 'vue'
import { useIdentity, type IdentityKey } from '~/composables/useIdentity'

export interface Letter {
  id: string
  whoFrom: IdentityKey
  whoTo: IdentityKey
  title: string
  content: string
  unlockDate: string // YYYY-MM-DD
  at: number
  locked?: boolean
}

interface ApiLetter {
  id: string
  who_from: IdentityKey
  who_to: IdentityKey
  title: string
  content: string | null
  unlock_date: string
  created_at: string
  locked?: boolean
}

interface LettersResponse {
  ok: boolean
  letters: ApiLetter[]
}

interface LetterResponse {
  ok: boolean
  letter: ApiLetter
}

export function useLetters() {
  const { identityKey } = useIdentity()
  const letters = ref<Letter[]>([])

  function mapRow(r: ApiLetter): Letter {
    return {
      id: r.id,
      whoFrom: r.who_from,
      whoTo: r.who_to,
      title: r.title || '',
      content: r.content || '',
      unlockDate: r.unlock_date,
      at: new Date(r.created_at).getTime(),
      locked: !!r.locked,
    }
  }

  async function fetchAll() {
    const identity = identityKey.value
    if (!identity) return
    const res = await $fetch<LettersResponse>('/api/letters', {
      query: { identity },
    })
    if (!res?.ok) throw new Error('加载信件失败')
    letters.value = res.letters.map(mapRow)
  }

  /** 打开单封信：收件人未到期时服务端会拒绝。 */
  async function openLetter(id: string): Promise<Letter> {
    const identity = identityKey.value
    if (!identity) throw new Error('还没有选择身份')
    const res = await $fetch<LetterResponse>(`/api/letters/${id}`, {
      query: { identity },
    })
    if (!res?.ok || !res.letter) throw new Error('打开信件失败')

    const mapped = mapRow({ ...res.letter, locked: false })
    const index = letters.value.findIndex((l) => l.id === id)
    if (index >= 0) letters.value[index] = mapped
    else letters.value.push(mapped)
    return mapped
  }

  /** 写一封信：from 写给 TA */
  async function sendLetter(
    from: IdentityKey,
    title: string,
    content: string,
    unlockDate: string,
  ) {
    if (!content.trim() || !unlockDate) return
    await $fetch('/api/letters', {
      method: 'POST',
      body: {
        identity: from,
        title: title.trim(),
        content: content.trim(),
        unlockDate,
      },
    })
    await fetchAll()
  }

  /** 重新编辑信（仅未到期时可用，服务端会再次校验） */
  async function updateLetter(
    id: string,
    identity: IdentityKey,
    patch: { title?: string; content?: string; unlockDate?: string },
  ) {
    const body: Record<string, unknown> = { identity }
    if (patch.title !== undefined) body.title = patch.title.trim()
    if (patch.content !== undefined) body.content = patch.content.trim()
    if (patch.unlockDate !== undefined) body.unlockDate = patch.unlockDate
    await $fetch(`/api/letters/${id}`, { method: 'PATCH', body })
    await fetchAll()
  }

  /** 撤回（删除）自己写的信 */
  async function removeLetter(id: string, identity: IdentityKey) {
    await $fetch(`/api/letters/${id}`, {
      method: 'DELETE',
      query: { identity },
    })
    await fetchAll()
  }

  watch(
    identityKey,
    (value) => {
      if (value) fetchAll().catch((err) => console.warn('[letters]', err))
    },
    { immediate: true },
  )

  return { letters, fetchAll, openLetter, sendLetter, updateLetter, removeLetter }
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
