import { adminRest } from '~/server/utils/supabase-admin'
import { requireUnlocked } from '~/server/utils/require-unlock'

interface CatRow {
  id: string
  role: 'user' | 'assistant'
  content: string
  created_at: string
}

/**
 * GET /api/cat-messages
 * 返回最近 100 条小猫对话（时间正序）。
 */
export default defineEventHandler(async (event) => {
  requireUnlocked(event)

  const rows = await adminRest<CatRow[]>('cat_messages', {
    query: {
      select: 'id,role,content,created_at',
      order: 'created_at.desc',
      limit: 100,
    },
  })

  return { ok: true, messages: rows.reverse() }
})
