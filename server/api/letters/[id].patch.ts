import { adminRest } from '~/server/utils/supabase-admin'
import { parseIdentity, requireUnlocked } from '~/server/utils/require-unlock'
import {
  assertUuid,
  cleanContent,
  cleanTitle,
  cleanUnlockDate,
  type LetterRow,
} from '~/server/utils/letters'
import { todayBeijing } from '~/server/utils/date'

/**
 * PATCH /api/letters/:id
 * body: { identity, title?, content?, unlockDate? }
 * 仅发件人、且信件尚未开启时可修改。
 */
export default defineEventHandler(async (event) => {
  requireUnlocked(event)
  const id = assertUuid(getRouterParam(event, 'id'))
  const body = await readBody<{
    identity?: unknown
    title?: unknown
    content?: unknown
    unlockDate?: unknown
  }>(event)
  const identity = parseIdentity(body.identity)

  const rows = await adminRest<LetterRow[]>('letters', {
    query: { select: '*', id: `eq.${id}`, limit: 1 },
  })
  const row = rows[0]
  if (!row) {
    throw createError({ statusCode: 404, statusMessage: '信件不存在' })
  }
  if (row.who_from !== identity) {
    throw createError({ statusCode: 403, statusMessage: '只有发件人可以修改' })
  }
  if (row.unlock_date <= todayBeijing()) {
    throw createError({ statusCode: 409, statusMessage: '信已开启，不能再修改' })
  }

  const patch: Record<string, unknown> = {}
  if (body.title !== undefined) patch.title = cleanTitle(body.title)
  if (body.content !== undefined) patch.content = cleanContent(body.content)
  if (body.unlockDate !== undefined) patch.unlock_date = cleanUnlockDate(body.unlockDate)

  if (!Object.keys(patch).length) {
    throw createError({ statusCode: 400, statusMessage: '没有需要修改的内容' })
  }

  const updated = await adminRest<LetterRow[]>('letters', {
    method: 'PATCH',
    query: { id: `eq.${id}` },
    body: patch,
  })

  return { ok: true, letter: updated[0] }
})
