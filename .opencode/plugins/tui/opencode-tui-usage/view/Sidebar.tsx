// ─── UI 层：侧边栏根组件（ViewModel：响应式编排 + 组装） ───
// 全部 Solid 信号/memo/副作用在此创建（组件 render 期间，owner 上下文正确）；
// 业务纯函数调 model/，查询服务调 quota/，展示组件调 view/。
/** @jsxImportSource @opentui/solid */
import { createEffect, createMemo, createSignal, onCleanup, Show, type JSX } from "solid-js"
import { usePlugin } from "@opencode-ai/plugin/tui"
import { appendFileSync, rmSync, statSync } from "fs"
import { homedir } from "os"
import { join } from "path"
import {
  aggregateUsage,
  calcCacheRate,
  calcPercent,
  contextUsageOf,
  resolveContextLimit,
  resolveProviderID,
} from "../model/usage.ts"
import { getQuotaStore, QUOTA_REFRESH_MS, type QuotaDeps } from "../model/quota.ts"
import { fetchQuota, getProviderApiUrl, isQuotaProvider } from "../quota/index.ts"
import { resolveProviderKey } from "../quota/key.ts"
import { QuotaSection } from "./QuotaSection.tsx"
import { UsageSection } from "./UsageSection.tsx"
import { UpdateBanner } from "./UpdateBanner.tsx"

// 进程内单例（跨 render 持久，与重构前模块级 Map 语义一致；deps 仅首次创建时生效）
let store: ReturnType<typeof getQuotaStore> | undefined
function quotaStore(deps: QuotaDeps) {
  if (!store) store = getQuotaStore(deps)
  return store
}

// ── 文件日志通道（长期保留：TUI console 不可见，文件日志为唯一诊断通道） ──
// 默认禁用（零开销）；排查问题时设置 TUI_USAGE_PROBE=1 再启动 opencode 客户端即启用：
//   pwsh: $env:TUI_USAGE_PROBE="1"; opencode
// 1MB 自我保护：官方 opencode.log 无任何清理机制，我们自己的日志文件自管（超限重建）
const PROBE_ENABLED = process.env.TUI_USAGE_PROBE === "1"
const probeLogPath = () => join(homedir(), ".local", "share", "opencode", "log", "tui-usage.log")
const logToFile = (msg: string) => {
  if (!PROBE_ENABLED) return
  try {
    const p = probeLogPath()
    try {
      if (statSync(p).size > 1_000_000) rmSync(p, { force: true })
    } catch {
      /* 文件不存在：首次写入 */
    }
    appendFileSync(p, `[${new Date().toISOString()}] [tui-usage] ${msg}\n`)
  } catch {
    /* 忽略：日志不可用不影响插件 */
  }
}
logToFile("sidebar module loaded")

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
    apiUrlFor: getProviderApiUrl, // 归一化查找：未注册供应商落 QUOTA_API_URL 兜底
    resolveKey: resolveProviderKey,
    fetch: fetchQuota,
    // TUI 插件无 app.log API（client 为 HTTP 客户端）；console 输出不可见（TUI 全屏），
    // 双写文件日志（受 TUI_USAGE_PROBE 开关门控，默认禁用）
    log: (level, message) => {
      if (level === "error") console.error(`[tui-usage] ${message}`)
      else console.warn(`[tui-usage] ${message}`)
      logToFile(`${level}: ${message}`)
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

  // 订阅 store 写库通知：任何组件发起的 load 写库后当前组件都会刷新（跨组件重建安全）
  onCleanup(
    store.subscribe(() => {
      setQuotaVer((v: number) => v + 1)
    }),
  )

  // effect：会话/数据变化触发首次加载（限流防抖，render 高频重建不连击）
  createEffect(() => {
    const pid = providerID()
    if (pid) void store.load(pid)
  })
  // timer：每 60s force 轮询（绕过限流，必然真请求；限流与轮询相位解耦）
  const timer = setInterval(() => {
    const pid = providerID()
    if (pid) void store.load(pid, { force: true })
  }, QUOTA_REFRESH_MS)
  onCleanup(() => clearInterval(timer))

  return (
    <Show when={usage()}>
      {(u) => (
        <box flexDirection="column" gap={1}>
          <UpdateBanner theme={theme} />
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