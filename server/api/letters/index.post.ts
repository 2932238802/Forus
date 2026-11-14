import { adminRest } from '~/server/utils/supabase-admin'
import { parseIdentity, partnerOf, requireUnlocked } from '~/server/utils/require-unlock'
import {
  cleanContent,
  cleanTitle,
  cleanUnlockDate,
  type LetterRow,
} from '~/server/utils/letters'

/**
 * POST /api/letters
 * body: { identity, title, content, unlockDate }
 */
export default defineEventHandler(async (event) => {
  requireUnlocked(event)

  const body = await readBody<{
    identity?: unknown
    title?: unknown
    content?: unknown
    unlockDate?: unknown
  }>(event)

  const identity = parseIdentity(body.identity)
  const title = cleanTitle(body.title)
  const content = cleanContent(body.content)
  const unlockDate = cleanUnlockDate(body.unlockDate)

  const rows = await adminRest<LetterRow[]>('letters', {
    method: 'POST',
    body: {
      who_from: identity,
      who_to: partnerOf(identity),
      title,
      content,
      unlock_date: unlockDate,
    },
  })

  return { ok: true, letter: rows[0] }
})
