// ─── 统一前缀：此插件所有 quota 逻辑由此分发 ───
// 供应商自动发现：quota/providers/<name>.ts 导出 provider 即视为一个供应商查询。
// 新增供应商 = 只新增 providers/<name>.ts 一个文件（glob 打包期展开，重启服务重新打包生效）。
import { createRegistry, QUOTA_API_URL, type ProviderRegistration } from "./registry.ts"

// bundler 静态展开（bun import.meta.glob eager）：收集 providers/ 下全部 .ts 模块
const modules = import.meta.glob("./providers/*.ts", { eager: true }) as Record<
  string,
  { provider?: ProviderRegistration }
>

const registered = Object.values(modules)
  .map((m) => m.provider)
  .filter((p): p is ProviderRegistration => !!p && p.enabled !== false)

const { isQuotaProvider, getProviderApiUrl, fetchQuota } = createRegistry(registered)

export { QUOTA_API_URL, isQuotaProvider, getProviderApiUrl, fetchQuota }