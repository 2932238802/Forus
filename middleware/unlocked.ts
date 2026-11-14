// 解锁守卫：未通过暗号（无有效签名 Cookie）时，访问附页会被送回主页解锁。
// 客户端首次校验后缓存结果，后续路由切换不再重复请求 /api/status。
// 不直接 import server 工具，避免 Node crypto 被打进浏览器包。
export default defineNuxtRouteMiddleware(async (to) => {
  // 主页本身不拦截（封面在主页）
  if (to.path === '/') return

  const { unlocked, ready } = usePassphrase()

  // 客户端已有可信状态：直接判断，不再请求
  if (import.meta.client && ready.value) {
    if (!unlocked.value) return navigateTo('/')
    return
  }

  // 服务端用 useRequestFetch（转发当前请求的 Cookie），客户端用普通 $fetch
  type StatusRequest = (url: string) => Promise<{ unlocked: boolean }>
  const request: StatusRequest = import.meta.server
    ? (useRequestFetch() as unknown as StatusRequest)
    : ($fetch as unknown as StatusRequest)
  try {
    const res = await request('/api/status')
    if (import.meta.client) {
      unlocked.value = !!res?.unlocked
      ready.value = true
    }
    if (!res?.unlocked) return navigateTo('/')
  } catch {
    if (import.meta.client) {
      unlocked.value = false
      ready.value = true
    }
    return navigateTo('/')
  }
})
