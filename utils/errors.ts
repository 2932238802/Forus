/** 把未知异常转成可展示的短文案。 */
export function errorMessage(err: unknown): string {
  if (err && typeof err === 'object') {
    const e = err as { statusMessage?: unknown; message?: unknown }
    if (typeof e.statusMessage === 'string' && e.statusMessage) return e.statusMessage
    if (typeof e.message === 'string' && e.message) return e.message
  }
  return String(err ?? '未知错误')
}

/** 统一的失败提示（本批次沿用 alert，后续可替换为 Toast）。 */
export function notifyError(action: string, err: unknown): void {
  alert(`${action}失败：${errorMessage(err)}`)
}
