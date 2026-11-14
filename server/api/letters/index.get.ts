import { adminRest } from '~/server/utils/supabase-admin'
import { parseIdentity, requireUnlocked } from '~/server/utils/require-unlock'
import { isUnlockedFor, type LetterRow } from '~/server/utils/letters'

/**
 * GET /api/letters?identity=you
 * 只返回与当前身份相关的信；未到期的收件信不返回正文。
 */
export default defineEventHandler(async (event) => {
  requireUnlocked(event)
  const identity = parseIdentity(getQuery(event).identity)

  const rows = await adminRest<LetterRow[]>('letters', {
    query: {
      select: '*',
      or: `(who_from.eq.${identity},who_to.eq.${identity})`,
      order: 'unlock_date.asc',
    },
  })

  const letters = rows.map((row) => {
    const unlocked = isUnlockedFor(row, identity)
    return {
      ...row,
      content: unlocked ? row.content : null,
      locked: !unlocked,
    }
  })

  return { ok: true, letters }
})
