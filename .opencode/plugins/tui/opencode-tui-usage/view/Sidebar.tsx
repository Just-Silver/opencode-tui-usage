// ─── UI 层：侧边栏根组件（ViewModel：响应式编排 + 组装） ───
// 全部 Solid 信号/memo/副作用在此创建（组件 render 期间，owner 上下文正确）；
// 业务纯函数调 model/，查询服务调 quota/，展示组件调 view/。
/** @jsxImportSource @opentui/solid */
import { createEffect, createMemo, createSignal, onCleanup, Show, type JSX } from "solid-js"
import { usePlugin } from "@opencode-ai/plugin/tui"
import {
  aggregateUsage,
  calcCacheRate,
  calcPercent,
  contextUsageOf,
  resolveContextLimit,
  resolveProviderID,
} from "../model/usage.ts"
import { getQuotaStore, QUOTA_REFRESH_MS, type QuotaDeps } from "../model/quota.ts"
import { fetchQuota, isQuotaProvider, PROVIDER_API_URL, QUOTA_API_URL } from "../quota/index.ts"
import { resolveProviderKey } from "../quota/key.ts"
import { QuotaSection } from "./QuotaSection.tsx"
import { UsageSection } from "./UsageSection.tsx"

// 进程内单例（跨 render 持久，与重构前模块级 Map 语义一致；deps 仅首次创建时生效）
let store: ReturnType<typeof getQuotaStore> | undefined
function quotaStore(deps: QuotaDeps) {
  if (!store) store = getQuotaStore(deps)
  return store
}

export function Sidebar(props: { sessionID?: string }): JSX.Element {
  const ctx = usePlugin()
  const theme = ctx.theme
  const sessionID = props.sessionID

  // ── 数据源 getter（在 memo 内调用即订阅） ──
  const messages = () => (sessionID ? (ctx.data.session.message.list(sessionID) ?? []) : [])
  const session = () =>
    sessionID ? ((ctx.data.session.get(sessionID) as { location?: string } | undefined) ?? undefined) : undefined
  const models = () =>
    session()?.location ? (ctx.data.location.model.list(session()!.location) ?? []) : []

  // ── 额度查询服务（单例；deps 的 log 首次创建时绑定 client） ──
  const store = quotaStore({
    apiUrlFor: (pid) => PROVIDER_API_URL[pid] ?? QUOTA_API_URL,
    resolveKey: resolveProviderKey,
    fetch: fetchQuota,
    log: (level, message) => {
      void ctx.client.app
        .log({ body: { service: "tui-usage", level, message } })
        .catch(() => {})
    },
  })

  // ── 会话用量（Model 纯函数 → memo） ──
  const usage = createMemo(() => (sessionID ? aggregateUsage(messages()) : undefined))
  const cacheRate = createMemo(() => calcCacheRate(usage()))
  const ctxUsage = createMemo(() => (sessionID ? contextUsageOf(messages()) : undefined))
  const limit = createMemo(() => {
    if (!sessionID || ctxUsage() === undefined) return
    const s = session()
    if (!s) return
    return resolveContextLimit(messages(), models())
  })
  const ctxPct = createMemo(() => calcPercent(ctxUsage(), limit()))

  // ── 当前会话供应商 ID ──
  const providerID = createMemo(() => {
    if (!sessionID) return
    return resolveProviderID(messages(), (id) => models().find((m) => m.id === id)?.providerID)
  })

  // ── 配额：按 providerID 分桶，字典缓存 ──
  const [quotaVer, setQuotaVer] = createSignal(0)
  const quota = createMemo(() => {
    void quotaVer()
    const pid = providerID()
    if (!pid) return
    // 白名单守卫：pid 任意写法，经 isQuotaProvider 归一化匹配（opencode-go / opencodego / opencode_go...）
    if (!isQuotaProvider(pid)) return
    return store.get(pid)
  })

  const refreshQuota = (pid: string) => {
    void store.load(pid).then((updated) => {
      if (updated) setQuotaVer((v: number) => v + 1)
    })
  }

  createEffect(() => {
    const pid = providerID()
    if (pid) refreshQuota(pid)
  })
  const timer = setInterval(() => {
    const pid = providerID()
    if (pid) refreshQuota(pid)
  }, QUOTA_REFRESH_MS)
  onCleanup(() => clearInterval(timer))

  return (
    <Show when={usage()}>
      {(u) => (
        <box flexDirection="column" gap={1}>
          <UsageSection
            theme={theme}
            usage={u()}
            ctxUsage={ctxUsage()}
            ctxPct={ctxPct()}
            limit={limit()}
            cacheRate={cacheRate()}
          />
          <QuotaSection theme={theme} quota={quota()} />
        </box>
      )}
    </Show>
  )
}