// ─── 查询服务层：供应商注册表纯逻辑（node 可测） ───
// createRegistry(providers) 由注册清单推导白名单/URL 表/fetcher 表；
// index.ts 运行时 fs 扫描 + 动态 import 发现 providers/*.ts 后调用本模块（全链无 import.meta.glob）。
import type { QuotaData } from "../model/types.ts"
import { normID } from "../shared/id.ts"

// 发现接口：providers/*.ts 导出 provider 即视为一个供应商查询
export type ProviderRegistration = {
  id: string
  apiUrl: string
  enabled?: boolean // 默认 true；false = 已实现但暂不激活（如等待真实数据验证）
  fetch: (apiUrl: string, key: string) => Promise<QuotaData | undefined>
}

export const QUOTA_API_URL = "https://opencode.ai/zen/go/v1/usage"

export function createRegistry(providers: ProviderRegistration[]) {
  // enabled:false 的注册项跳过（已实现但未验证的供应商不进入白名单）
  const active = providers.filter((p) => p.enabled !== false)
  const apiUrls: Record<string, string> = Object.fromEntries(active.map((p) => [p.id, p.apiUrl]))
  const fns: Record<string, (apiUrl: string, key: string) => Promise<QuotaData | undefined>> = Object.fromEntries(
    active.map((p) => [p.id, p.fetch]),
  )

  // 白名单守卫：pid（用户配置写法）是否命中已注册供应商（任意写法，归一化匹配）
  const isQuotaProvider = (pid: string): boolean => {
    const n = normID(pid)
    return (
      active.some((p) => normID(p.id) === n) ||
      Object.keys(apiUrls).some((id) => normID(id) === n)
    )
  }

  // API URL 查找同样归一化；未命中回退 QUOTA_API_URL
  const getProviderApiUrl = (pid: string): string => {
    const n = normID(pid)
    return Object.entries(apiUrls).find(([id]) => normID(id) === n)?.[1] ?? QUOTA_API_URL
  }

  // 按供应商分发 fetcher：归一化匹配
  const fetchQuota = async (pid: string, apiUrl: string, key: string): Promise<QuotaData | undefined> => {
    const n = normID(pid)
    const entry = Object.entries(fns).find(([id]) => normID(id) === n)
    if (entry) return entry[1](apiUrl, key)
    return undefined
  }

  return { isQuotaProvider, getProviderApiUrl, fetchQuota }
}