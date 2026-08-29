import type { QuotaData } from "../model/types.ts"
import { fetchOpencodeGo } from "./opencode-go.ts"
import { normID } from "../shared/id.ts"

// ─── 统一前缀：此插件所有 quota 逻辑由此分发 ───
// 新增供应商：1) 在此追加 PROVIDER_API_URL；2) 在 quota/ 下新增 <provider>.ts 并在 fetchers 注册

export const QUOTA_API_URL = "https://opencode.ai/zen/go/v1/usage"
export const OPENCODE_GO_INTEGRATION = "opencode-go"

export const QUOTA_INTEGRATIONS = [OPENCODE_GO_INTEGRATION] as const

export const PROVIDER_API_URL: Record<string, string> = {
  [OPENCODE_GO_INTEGRATION]: QUOTA_API_URL,
  // 例： "anthropic": "https://api.anthropic.com/v1/usage",
}

// 供应商 ID 归一化：小写 + 只保留英文小写字符。
// 用于「我方写死的 ID」与「用户任意写法」的比较（opencode-go / opencode_go / Opencode-Go → opencodego）。
// 官方（ProviderV2.ID = Schema.String）无字符限制也不归一化，此处仅作用于我们自己的匹配层；
// 配置 key / DB integration_id 与会话 pid 同源原样，不参与归一化。

// 白名单守卫：pid（用户配置写法）是否命中我们支持的供应商（任意写法）
export function isQuotaProvider(pid: string): boolean {
  const n = normID(pid)
  return (
    QUOTA_INTEGRATIONS.some((id) => normID(id) === n) ||
    Object.keys(PROVIDER_API_URL).some((id) => normID(id) === n)
  )
}

// 按供应商分发的 fetcher：pid -> (apiUrl, key) -> QuotaData
export const fetchers: Record<string, (apiUrl: string, key: string) => Promise<QuotaData | undefined>> = {
  [OPENCODE_GO_INTEGRATION]: fetchOpencodeGo,
  // 例： "anthropic": fetchAnthropic,
}

export async function fetchQuota(pid: string, apiUrl: string, key: string): Promise<QuotaData | undefined> {
  const n = normID(pid)
  const entry = Object.entries(fetchers).find(([id]) => normID(id) === n)
  if (entry) return entry[1](apiUrl, key)
  return undefined
}

export type { QuotaData, QuotaWindow } from "./types"
