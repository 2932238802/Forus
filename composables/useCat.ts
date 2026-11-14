import { ref, onMounted } from 'vue'

export interface CatMessage {
  id?: string
  role: 'user' | 'assistant'
  content: string
  at: number
}

interface ApiCatMessage {
  id: string
  role: string
  content: string
  created_at: string
}

interface CatMessagesResponse {
  ok: boolean
  messages: ApiCatMessage[]
}

export function useCat() {
  const messages = ref<CatMessage[]>([])
  const thinking = ref(false)

  function mapRow(row: ApiCatMessage): CatMessage {
    return {
      id: row.id,
      role: row.role === 'assistant' ? 'assistant' : 'user',
      content: row.content,
      at: new Date(row.created_at).getTime(),
    }
  }

  async function fetchHistory() {
    try {
      const res = await $fetch<CatMessagesResponse>('/api/cat-messages')
      if (res?.ok) messages.value = res.messages.map(mapRow)
    } catch (err) {
      console.warn('[cat] 加载历史失败', err)
    }
  }

  /**
   * 发一条消息给小猫。
   * 历史由服务端读取并持久化，客户端只负责展示；对话在两个人之间共享。
   */
  async function send(text: string) {
    const msg = text.trim()
    if (!msg || thinking.value) return

    messages.value.push({ role: 'user', content: msg, at: Date.now() })
    thinking.value = true
    try {
      const res = await $fetch<{ ok: boolean; reply?: string; error?: string }>(
        '/api/cat',
        { method: 'POST', body: { message: msg } },
      )
      const reply = res.ok && res.reply ? res.reply : res.error || '喵…'
      messages.value.push({ role: 'assistant', content: reply, at: Date.now() })
    } catch {
      messages.value.push({
        role: 'assistant',
        content: '喵…小猫走神了，再叫我一声嘛～',
        at: Date.now(),
      })
    } finally {
      thinking.value = false
    }
  }

  onMounted(fetchHistory)

  return { messages, thinking, send, fetchHistory }
}
