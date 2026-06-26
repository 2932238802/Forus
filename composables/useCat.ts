import { ref, onMounted } from 'vue'
import { useSupabaseClient } from '#imports'

export interface CatMessage {
  id?: string
  role: 'user' | 'assistant'
  content: string
  at: number
}

export function useCat() {
  const supabase = useSupabaseClient()
  const messages = ref<CatMessage[]>([])
  const thinking = ref(false)

  function mapRow(r: any): CatMessage {
    return {
      id: r.id,
      role: r.role === 'assistant' ? 'assistant' : 'user',
      content: r.content,
      at: new Date(r.created_at).getTime(),
    }
  }

  async function fetchHistory() {
    const { data, error } = await supabase
      .from('cat_messages')
      .select('*')
      .order('created_at', { ascending: true })
      .limit(100)
    if (!error && data) messages.value = data.map(mapRow)
  }

  async function saveMessage(role: 'user' | 'assistant', content: string) {
    await supabase.from('cat_messages').insert({ role, content })
  }

  /** 发一条消息给小猫，拿回复 */
  async function send(text: string) {
    const msg = text.trim()
    if (!msg || thinking.value) return
    // 先本地显示用户消息
    messages.value.push({ role: 'user', content: msg, at: Date.now() })
    saveMessage('user', msg)
    thinking.value = true
    try {
      // 取最近 10 条作为上下文
      const history = messages.value
        .slice(-11, -1)
        .map((m) => ({ role: m.role, content: m.content }))
      const res = await $fetch<{ ok: boolean; reply?: string; error?: string }>('/api/cat', {
        method: 'POST',
        body: { message: msg, history },
      })
      const reply = res.ok && res.reply ? res.reply : (res.error || '喵…')
      messages.value.push({ role: 'assistant', content: reply, at: Date.now() })
      if (res.ok && res.reply) saveMessage('assistant', reply)
    } catch {
      messages.value.push({ role: 'assistant', content: '喵…小猫走神了，再叫我一声嘛～', at: Date.now() })
    } finally {
      thinking.value = false
    }
  }

  onMounted(fetchHistory)

  return { messages, thinking, send, fetchHistory }
}
