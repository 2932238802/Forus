import { adminRest } from '~/server/utils/supabase-admin'
import { parseIdentity, requireUnlocked } from '~/server/utils/require-unlock'
import {
  assertUuid,
  isUnlockedFor,
  type LetterRow,
} from '~/server/utils/letters'

/**
 * GET /api/letters/:id?identity=you
 * 发件人始终可读；收件人仅在开启日当天及之后可读。
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
  if (row.who_from !== identity && row.who_to !== identity) {
    throw createError({ statusCode: 403, statusMessage: '无权查看这封信' })
  }
  if (!isUnlockedFor(row, identity)) {
    throw createError({ statusCode: 403, statusMessage: '还没到开启的日子' })
  }

  return { ok: true, letter: { ...row, locked: false } }
})
