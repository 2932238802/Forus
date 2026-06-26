import { verifyToken, UNLOCK_COOKIE } from '~/server/utils/token'
import { CAT_PERSONA, matchTriggers } from '~/server/utils/cat-brain'
import { siteConfig } from '~/data/site'

interface ChatMsg {
  role: 'user' | 'assistant'
  content: string
}

/**
 * POST /api/cat
 * body: { message: string, history: ChatMsg[] }
 * 校验解锁 Cookie → 组装上下文（你们的数据）→ 调 DeepSeek → 返回小猫回复。
 */
export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()

  // 1) 鉴权：必须已通过暗号
  const token = getCookie(event, UNLOCK_COOKIE)
  if (!verifyToken(token, config.authSecret)) {
    setResponseStatus(event, 401)
    return { ok: false, error: '未解锁' }
  }

  if (!config.deepseekKey) {
    setResponseStatus(event, 500)
    return { ok: false, error: '小猫还没配置好（缺 DeepSeek key）' }
  }

  const body = await readBody<{ message?: string; history?: ChatMsg[] }>(event)
  const message = (body.message || '').trim()
  if (!message) {
    setResponseStatus(event, 400)
    return { ok: false, error: '消息为空' }
  }
  const history = Array.isArray(body.history) ? body.history.slice(-10) : []

  // 2) 组装基础背景数据
  const contextParts: string[] = []

  // 在一起天数 / 纪念日 / 生日
  const start = new Date(siteConfig.startDate + 'T00:00:00')
  const days = Math.floor((Date.now() - start.getTime()) / 86400000) + 1
  contextParts.push(
    `- ${siteConfig.you} 和 ${siteConfig.npy} 从 ${siteConfig.startDate} 在一起，到今天约 ${days} 天。`,
    `- ${siteConfig.npy} 的生日是 ${siteConfig.birthdayNpy}，${siteConfig.you} 的生日是 ${siteConfig.birthdayYou}。`,
  )

  // 3) 关键词触发：按命中查询对应栏目
  const triggers = matchTriggers(message)
  const sb = (path: string) =>
    $fetch<any[]>(`${config.public.supabase.url}/rest/v1/${path}`, {
      headers: {
        apikey: config.public.supabase.key as string,
        Authorization: `Bearer ${config.public.supabase.key}`,
      },
    }).catch(() => [])

  if (triggers.includes('notes')) {
    const rows = await sb('notes?select=author,text,kind&order=created_at.desc&limit=8')
    const lines = rows.filter((r) => r.kind !== 'image').map((r) => `${r.author}：${r.text}`)
    if (lines.length) contextParts.push(`- 最近的留言：\n  ${lines.join('\n  ')}`)
  }
  if (triggers.includes('goals')) {
    const rows = await sb('goals?select=title,done&order=created_at.desc&limit=12')
    const lines = rows.map((r) => `${r.done ? '✓' : '○'} ${r.title}`)
    if (lines.length) contextParts.push(`- 他们想一起做的事：\n  ${lines.join('\n  ')}`)
  }
  if (triggers.includes('likes')) {
    const rows = await sb('likes?select=owner,kind,text,category&limit=60')
    const fmtOwner = (o: string) => (o === 'you' ? siteConfig.you : siteConfig.npy)
    const like = rows.filter((r) => r.kind === 'like').map((r) => `${fmtOwner(r.owner)}喜欢${r.text}`)
    const dislike = rows.filter((r) => r.kind === 'dislike').map((r) => `${fmtOwner(r.owner)}不喜欢${r.text}`)
    if (like.length) contextParts.push(`- 喜欢：${like.slice(0, 20).join('、')}`)
    if (dislike.length) contextParts.push(`- 不喜欢：${dislike.slice(0, 20).join('、')}`)
  }
  // anniversary 已在基础数据里覆盖

  const systemPrompt = CAT_PERSONA.replace('{context}', contextParts.join('\n'))

  // 4) 调 DeepSeek
  try {
    const res = await $fetch<any>('https://api.deepseek.com/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${config.deepseekKey}`,
        'Content-Type': 'application/json',
      },
      body: {
        model: 'deepseek-chat',
        messages: [
          { role: 'system', content: systemPrompt },
          ...history,
          { role: 'user', content: message },
        ],
        temperature: 1.1,
        max_tokens: 500,
      },
    })
    const reply = res?.choices?.[0]?.message?.content?.trim() || '喵…我有点没听懂，姐姐再说一遍嘛～'
    return { ok: true, reply }
  } catch (err: any) {
    setResponseStatus(event, 500)
    return { ok: false, error: '小猫睡着了，待会儿再找它玩吧～' }
  }
})
