import { requireUnlocked } from '~/server/utils/require-unlock'

/**
 * POST /api/media/delete
 * body: { paths: string[] }
 * 使用 service_role 删除 Storage 文件；anon 不再拥有 update/delete 权限。
 */
export default defineEventHandler(async (event) => {
  requireUnlocked(event)

  const body = await readBody<{ paths?: unknown }>(event)
  const paths = Array.isArray(body.paths)
    ? body.paths
        .filter((p): p is string => typeof p === 'string')
        .map((p) => p.trim())
        .filter((p) => p && !p.includes('..') && !p.startsWith('/') && p.length <= 512)
        .slice(0, 20)
    : []

  if (!paths.length) {
    throw createError({ statusCode: 400, statusMessage: '没有需要删除的文件' })
  }

  const config = useRuntimeConfig()
  const url =
    (config.public.supabase.url as string) ||
    process.env.NUXT_PUBLIC_SUPABASE_URL ||
    process.env.SUPABASE_URL ||
    ''
  const key =
    (config.supabaseServiceKey as string) ||
    process.env.NUXT_SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    ''
  if (!url || !key) {
    throw createError({
      statusCode: 500,
      statusMessage: '服务端缺少 SUPABASE_SERVICE_ROLE_KEY',
    })
  }

  await $fetch(`${url}/storage/v1/object/media`, {
    method: 'DELETE',
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
    },
    body: { prefixes: paths },
  })

  return { ok: true, removed: paths.length }
})
