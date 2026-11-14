function pad(n: number): string {
  return String(n).padStart(2, '0')
}

/** M/D HH:mm */
export function formatShortDateTime(at: number): string {
  const d = new Date(at)
  return `${d.getMonth() + 1}/${d.getDate()} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

/** YYYY/MM/DD HH:mm */
export function formatFullDateTime(at: number): string {
  const d = new Date(at)
  return `${d.getFullYear()}/${pad(d.getMonth() + 1)}/${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

/** 刚刚 / N 分钟前 / N 小时前 / 昨天 / N 天前 / YYYY-MM-DD */
export function formatRelative(at: number): string {
  const d = new Date(at)
  const diff = Date.now() - at
  const mins = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)
  if (mins < 1) return '刚刚'
  if (mins < 60) return `${mins} 分钟前`
  if (hours < 24) return `${hours} 小时前`
  if (days === 1) return '昨天'
  if (days < 7) return `${days} 天前`
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}
