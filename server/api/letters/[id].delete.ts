import { adminRest } from '~/server/utils/supabase-admin'
import { parseIdentity, requireUnlocked } from '~/server/utils/require-unlock'
import { assertUuid, type LetterRow } from '~/server/utils/letters'

/**
 * DELETE /api/letters/:id?identity=you
 * 仅发件人可撤回。
 */
export default defineEventHandler(async (event) => {
  requireUnlocked(event)
  const id = assertUuid(getRouterParam(event, 'id'))
  const identity = parseIdentity(getQuery(event).identity)

  const rows = await adminRest<LetterRow[]>('letters', {
    query: { select: '*', id: `eq.${id}`, limit: 1 },
  })
  const row = rows[0]
  if (!row) {
    throw createError({ statusCode: 404, statusMessage: '信件不存在' })
  }
  if (row.who_from !== identity) {
    throw createError({ statusCode: 403, statusMessage: '只有发件人可以撤回' })
  }

  await adminRest<LetterRow[]>('letters', {
    method: 'DELETE',
    query: { id: `eq.${id}` },
    headers: { Prefer: 'return=minimal' },
  })

  return { ok: true }
})
