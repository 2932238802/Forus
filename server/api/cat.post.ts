import { CAT_PERSONA, matchTriggers } from '~/server/utils/cat-brain'
import { adminRest } from '~/server/utils/supabase-admin'
import { requireUnlocked } from '~/server/utils/require-unlock'
import { daysTogetherBeijing } from '~/server/utils/date'
import { siteConfig } from '~/data/site'

interface CatRow {
  id?: string
  role: 'user' | 'assistant'
  content: string
  created_at: string
}

interface ChatMsg {
  role: 'user' | 'assistant'
  content: string
}

async function saveMessage(role: 'user' | 'assistant', content: string) {
  try {
    await adminRest('cat_messages', {
      method: 'POST',
      body: { role, content },
    })
  } catch (err) {
    console.error('[cat] 保存消息失败', err)
  }
}

async function loadHistory(limit = 10): Promise<ChatMsg[]> {
  try {
    const rows = await adminRest<CatRow[]>('cat_messages', {
      query: {
        select: 'role,content,created_at',
        order: 'created_at.desc',
        limit,
      },
    })
    return rows
      .reverse()
      .filter(
        (row) =>
          (row.role === 'user' || row.role === 'assistant') &&
          typeof row.content === 'string',
      )
      .map((row) => ({ role: row.role, content: row.content }))
  } catch (err) {
    console.error('[cat] 读取历史失败', err)
    return []
  }
}

/**
 * POST /api/cat
 * body: { message: string }
 * 校验解锁 Cookie → 读取服务端历史 → 组装上下文 → 调 DeepSeek → 持久化 → 返回回复。
 */
export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  requireUnlocked(event)

  if (!config.catApiKey) {
    setResponseStatus(event, 500)
    return { ok: false, error: '小猫还没配置好（缺 API key）' }
  }

  const body = await readBody<{ message?: string }>(event)
  const message = String(body.message || '').trim()
  if (!message) {
    setResponseStatus(event, 400)
    return { ok: false, error: '消息为空' }
  }
  if (message.length > 500) {
    setResponseStatus(event, 400)
    return { ok: false, error: '消息太长了，最多 500 字' }
  }

  // 1) 基础背景数据
  const contextParts: string[] = []

  // 北京时间，让小猫能在深夜自然提醒早点睡
  const bjNow = new Date(Date.now() + 8 * 3600 * 1000)
  const hour = bjNow.getUTCHours()
  const period =
    hour < 6 ? '凌晨' : hour < 11 ? '早上' : hour < 14 ? '中午' : hour < 18 ? '下午' : hour < 23 ? '晚上' : '深夜'
  contextParts.push(
    `- 现在是北京时间 ${String(hour).padStart(2, '0')}:${String(bjNow.getUTCMinutes()).padStart(2, '0')}（${period}）。如果已经很晚了（深夜或凌晨），可以温柔地提醒岑姐姐早点睡、别熬夜。`,
  )

  const days = daysTogetherBeijing(siteConfig.startDate)
  contextParts.push(
    `- ${siteConfig.you} 和 ${siteConfig.npy} 从 ${siteConfig.startDate} 在一起，到今天约 ${days} 天。`,
    `- ${siteConfig.npy} 的生日是农历六月初六，${siteConfig.you} 的生日是 ${siteConfig.birthdayYou}。`,
  )

  // 2) 关键词触发：按命中查询对应栏目
  const triggers = matchTriggers(message)
  const queryRows = async <T>(path: string, query: Record<string, string | number>) => {
    try {
      return await adminRest<T[]>(path, { query })
    } catch (err) {
      console.error(`[cat] 查询 ${path} 失败`, err)
      return []
    }
  }

  if (triggers.includes('notes')) {
    const rows = await queryRows<{ author: string; text: string; kind: string }>('notes', {
      select: 'author,text,kind',
      order: 'created_at.desc',
      limit: 8,
    })
    const lines = rows.filter((r) => r.kind !== 'image').map((r) => `${r.author}：${r.text}`)
    if (lines.length) contextParts.push(`- 最近的留言：\n  ${lines.join('\n  ')}`)
  }
  if (triggers.includes('goals')) {
    const rows = await queryRows<{ title: string; done: boolean }>('goals', {
      select: 'title,done',
      order: 'created_at.desc',
      limit: 12,
    })
    const lines = rows.map((r) => `${r.done ? '✓' : '○'} ${r.title}`)
    if (lines.length) contextParts.push(`- 他们想一起做的事：\n  ${lines.join('\n  ')}`)
  }
  if (triggers.includes('likes')) {
    const rows = await queryRows<{ owner: string; kind: string; text: string }>('likes', {
      select: 'owner,kind,text',
      limit: 60,
    })
    const fmtOwner = (o: string) => (o === 'you' ? siteConfig.you : siteConfig.npy)
    const like = rows.filter((r) => r.kind === 'like').map((r) => `${fmtOwner(r.owner)}喜欢${r.text}`)
    const dislike = rows.filter((r) => r.kind === 'dislike').map((r) => `${fmtOwner(r.owner)}不喜欢${r.text}`)
    if (like.length) contextParts.push(`- 喜欢：${like.slice(0, 20).join('、')}`)
    if (dislike.length) contextParts.push(`- 不喜欢：${dislike.slice(0, 20).join('、')}`)
  }

  const systemPrompt = CAT_PERSONA.replace('{context}', contextParts.join('\n'))
  const history = await loadHistory(10)

  // 3) 先持久化用户消息，再请求模型
  await saveMessage('user', message)

  try {
    const res = await $fetch<{
      choices?: { message?: { content?: string } }[]
    }>(`${String(config.catApiBase).replace(/\/$/, '')}/chat/completions`, {
      method: 'POST',
      timeout: 20_000,
      headers: {
        Authorization: `Bearer ${config.catApiKey}`,
        'Content-Type': 'application/json',
      },
      body: {
        model: config.catModel,
        messages: [
          { role: 'system', content: systemPrompt },
          ...history,
          { role: 'user', content: message },
        ],
        temperature: 1.1,
        max_tokens: 500,
      },
    })
    const reply =
      res?.choices?.[0]?.message?.content?.trim() ||
      '喵…我有点没听懂，姐姐再说一遍嘛～'
    await saveMessage('assistant', reply)
    return { ok: true, reply }
  } catch (err) {
    console.error('[cat] 上游请求失败', err)
    setResponseStatus(event, 500)
    return { ok: false, error: '小猫睡着了，待会儿再找它玩吧～' }
  }
})
