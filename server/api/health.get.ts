import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface DeployInfo {
  commit?: string
  deployedAt?: string
  productVersion?: string
}

interface HealthPayload {
  ok: true
  time: string
  commit?: string
  version?: string
  deployedAt?: string
}

// update.sh 在重启前把本次部署的 commit 写入该文件；缺失时接口降级为只返回 ok/time。
const DEPLOY_INFO_FILE =
  process.env.NUXT_DEPLOY_INFO_FILE ||
  process.env.FORUS_DEPLOY_INFO_FILE ||
  resolve(process.cwd(), '.data/deploy-info.json')

export default defineEventHandler((): HealthPayload => {
  const payload: HealthPayload = { ok: true, time: new Date().toISOString() }

  try {
    const info = JSON.parse(readFileSync(DEPLOY_INFO_FILE, 'utf8')) as DeployInfo
    if (info.commit) payload.commit = String(info.commit)
    if (info.productVersion) payload.version = String(info.productVersion)
    if (info.deployedAt) payload.deployedAt = String(info.deployedAt)
  }
  catch {
    // 文件不存在或损坏时保持降级响应，不阻断健康检查。
  }

  return payload
})
