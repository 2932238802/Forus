/**
 * Service-role PostgREST client.
 *
 * Only import this from server code. The service role key bypasses RLS, so it
 * must never reach the browser bundle or public runtime config.
 */
interface AdminRestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE'
  body?: unknown
  query?: Record<string, string | number | boolean>
  headers?: Record<string, string>
}

export async function adminRest<T = unknown>(
  path: string,
  options: AdminRestOptions = {},
): Promise<T> {
  const config = useRuntimeConfig()
  // Internal URL points directly at the PostgREST root (e.g. http://forus-rest:3000),
  // so table paths are appended without the Supabase-style /rest/v1 prefix.
  const internalUrl = (config.supabaseInternalUrl as string) || ''
  const url =
    internalUrl ||
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

  const query = options.query
    ? '?' +
      new URLSearchParams(
        Object.entries(options.query).map(([k, v]) => [k, String(v)]),
      ).toString()
    : ''

  const restPath = internalUrl ? `/${path}` : `/rest/v1/${path}`
  return (await $fetch<T>(`${url.replace(/\/$/, '')}${restPath}${query}`, {
    method: options.method || 'GET',
    body: options.body as Record<string, unknown> | undefined,
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
      ...options.headers,
    },
  })) as unknown as T
}
