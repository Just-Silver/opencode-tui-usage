import type { QuotaData } from "./types"
import { fetchOpencodeGo } from "./opencode-go"

// ─── 统一前缀：此插件所有 quota 逻辑由此分发 ───
// 新增供应商：1) 在此追加 PROVIDER_API_URL；2) 在 quota/ 下新增 <provider>.ts 并在 fetchers 注册

export const QUOTA_API_URL = "https://opencode.ai/zen/go/v1/usage"
export const OPENCODE_GO_INTEGRATION = "opencode-go"

export const QUOTA_INTEGRATIONS = [OPENCODE_GO_INTEGRATION] as const

export const PROVIDER_API_URL: Record<string, string> = {
  [OPENCODE_GO_INTEGRATION]: QUOTA_API_URL,
  // 例： "anthropic": "https://api.anthropic.com/v1/usage",
}

// 按供应商分发的 fetcher：pid -> (apiUrl, key) -> QuotaData
export const fetchers: Record<string, (apiUrl: string, key: string) => Promise<QuotaData | undefined>> = {
  [OPENCODE_GO_INTEGRATION]: fetchOpencodeGo,
  // 例： "anthropic": fetchAnthropic,
}

export async function fetchQuota(pid: string, apiUrl: string, key: string): Promise<QuotaData | undefined> {
  const fn = fetchers[pid]
  if (fn) return fn(apiUrl, key)
  return undefined
}

export type { QuotaData, QuotaWindow } from "./types"
