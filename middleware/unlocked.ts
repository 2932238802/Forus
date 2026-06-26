// 解锁守卫：未通过暗号（无有效签名 Cookie）时，访问附页会被送回主页解锁。
// 统一通过 /api/status 判定（服务端用 useRequestFetch 自动转发 Cookie）。
// 不直接 import server 工具，避免 Node crypto 被打进浏览器包。
export default defineNuxtRouteMiddleware(async (to) => {
  // 主页本身不拦截（封面在主页）
  if (to.path === '/') return

  // 服务端用 useRequestFetch（转发当前请求的 Cookie），客户端用普通 $fetch
  const request = import.meta.server ? useRequestFetch() : $fetch
  try {
    const res = await request<{ unlocked: boolean }>('/api/status')
    if (!res?.unlocked) return navigateTo('/')
  } catch {
    return navigateTo('/')
  }
})
