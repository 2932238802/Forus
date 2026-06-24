// 解锁守卫：未输入暗号时，访问附页会被送回主页（在主页看封面解锁）
export default defineNuxtRouteMiddleware((to) => {
  // 主页本身不拦截（封面在主页）
  if (to.path === '/') return
  // 仅客户端能读 localStorage
  if (import.meta.client) {
    const unlocked = localStorage.getItem('forus_unlocked') === '1'
    if (!unlocked) return navigateTo('/')
  }
})
