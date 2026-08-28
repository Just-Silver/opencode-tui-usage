/** @jsxImportSource @opentui/solid */
import { Plugin, usePlugin } from "@opencode-ai/plugin/tui"
import { createEffect, createMemo, createSignal, onCleanup, Show, type JSX } from "solid-js"
import { homedir } from "os"
import { join } from "path"

// ─── 可调常量（修改后重载插件生效） ─────────────────────
// 额度查询已按供应商拆分到 ./opencode-tui-usage/quota/*，统一前缀便于识别为同一插件
import {
  fetchQuota,
  OPENCODE_GO_INTEGRATION,
  PROVIDER_API_URL,
  QUOTA_API_URL,
  QUOTA_INTEGRATIONS,
} from "./opencode-tui-usage/quota/index"
import type { QuotaData, QuotaWindow } from "./opencode-tui-usage/quota/types"
const QUOTA_REFRESH_MS = 60_000 // 配额轮询间隔
const OPENCODE_DATA_DIR_NAME = "opencode" // opencode 数据目录名
const OPENCODE_DATA_DIR_REL = [".local", "share", "opencode"] // ~ 下相对路径
const OPENCODE_DB_FILE = "opencode.db"
const CREDENTIAL_SQL = "SELECT value FROM credential WHERE integration_id = ?"
// 进度条颜色阈值（上下文占用 / 配额占比）
const PCT_WARN_THRESHOLD = 50 // ≥50% 变黄
const PCT_ERROR_THRESHOLD = 85 // ≥85% 变红
// 布局
const LABEL_COL_WIDTH = 10 // 数据行 label 对齐列宽
const CONTENT_INDENT = 2 // 折叠内容缩进
const ARROW_COLOR = "#888" // 折叠箭头/摘要颜色
// 区块标题与窗口标签
const SECTION_CACHE_TITLE = "缓存"
const SECTION_QUOTA_TITLE = "额度"
const QUOTA_LABELS = ["5h", "周", "月"] as const

// ─── 配色 ──────────────────────────────────────────────
const INPUT_COLOR = "#6bcf7f" // 绿
const WARN_COLOR = "#ffd93d" // 黄
const ERROR_COLOR = "#ff6b6b" // 红

// ─── 格式化工具 ────────────────────────────────────────
// token 数：123.6k / 200k / 28.4k
function fmtTokens(v: number): string {
  if (v >= 1_000_000) return trimZero((v / 1_000_000).toFixed(1)) + "M"
  if (v >= 1000) return trimZero((v / 1000).toFixed(1)) + "k"
  return String(v)
}
function trimZero(s: string): string {
  return s.replace(/\.0$/, "")
}

// 按显示宽度补空格（中文占 2 列），让值列对齐
function padLabel(s: string, width: number): string {
  const disp = [...s].reduce((w, ch) => w + (ch.charCodeAt(0) > 0x2e80 ? 2 : 1), 0)
  return s + " ".repeat(Math.max(0, width - disp))
}

// 官方渲染方式的进度条：OpenTUI box 背景色块 + flexGrow 比例填充
// （无点阵颗粒，连续实色条，宽度自适应）
function ColorBar(props: { pct: number | undefined; color: string }) {
  const p = props.pct
  if (p === undefined) return null
  const clamped = Math.max(0, Math.min(100, p))
  return (
    <box flexDirection="row" flexGrow={1} flexShrink={0} minWidth={0}>
      <box backgroundColor={props.color} flexGrow={clamped} flexShrink={0} />
      <box flexGrow={100 - clamped} flexShrink={0} />
    </box>
  )
}

// ─── 折叠区域（参考内置 opencode.sidebar.mcp 的 g8t 实现：▼/▶ 箭头、
//      粗体标题、整行 onMouseDown 切换、折叠时显示摘要、状态持久化） ──
const collapseState = new Map<string, boolean>()
function Collapsible(props: {
  title: string
  arrowColor: string
  titleColor: string
  summaryColor: string
  summary?: JSX.Element
  children: JSX.Element
}): JSX.Element {
  const [isOpen, setIsOpen] = createSignal(collapseState.get(props.title) ?? true)
  const toggle = () => {
    setIsOpen((v) => {
      const next = !v
      collapseState.set(props.title, next)
      return next
    })
  }
  return (
    <box flexDirection="column" gap={0}>
      <box flexDirection="row" gap={1} onMouseDown={toggle}>
        <text fg={props.arrowColor}>{() => (isOpen() ? "▼" : "▶")}</text>
        <text fg={props.titleColor}>
          <b>{props.title}</b>
        </text>
        <Show when={!isOpen() && props.summary}>
          <text fg={props.summaryColor}>{props.summary}</text>
        </Show>
      </box>
      <Show when={isOpen()}>
        <box paddingLeft={CONTENT_INDENT}>{props.children}</box>
      </Show>
    </box>
  )
}

// ─── 配额获取（按供应商分桶：Map<providerID, QuotaData>） ──
const keyCache = new Map<string, string>()
const quotaCache = new Map<string, QuotaData>() // 字典：providerID -> QuotaData，后续多供应商扩展
const quotaAt = new Map<string, number>() // 字典：providerID -> 上次刷新时间戳
const quotaInFlight = new Map<string, Promise<void>>() // 去重：同 provider 并发只发一次

// 通用读取：按 integrationId 读取凭据（TUI 进程内按需读 DB，命中缓存直接返回）
async function readProviderKey(integrationId: string): Promise<string | undefined> {
  if (keyCache.has(integrationId)) return keyCache.get(integrationId)
  try {
    const { Database } = await import("bun:sqlite")
    const base = process.env.XDG_DATA_HOME?.trim()
      ? join(process.env.XDG_DATA_HOME, OPENCODE_DATA_DIR_NAME)
      : join(homedir(), ...OPENCODE_DATA_DIR_REL)
    const db = new Database(join(base, OPENCODE_DB_FILE), { readonly: true })
    const row = db.query(CREDENTIAL_SQL).get(integrationId) as { value?: string } | undefined
    db.close()
    if (!row?.value) return
    const parsed = JSON.parse(row.value)
    if (typeof parsed.key === "string") {
      keyCache.set(integrationId, parsed.key)
      return parsed.key
    }
    return
  } catch (e) {
    console.warn(`readProviderKey ${integrationId} failed: ${String(e)}`)
    return
  }
}



export default Plugin.define({
  id: "opencode-tui-usage",
  setup(context) {
    context.ui.slot({
      append: "sidebar.content",
      render: ({ sessionID }: { sessionID?: string }) => {
        const ctx = usePlugin()
        const theme = ctx.theme

        // ── 用量聚合（响应式：消息到达自动重算） ──
        const usage = createMemo(() => {
          if (!sessionID) return
          const messages = ctx.data.session.message.list(sessionID) ?? []
          let input = 0
          let output = 0
          let reasoning = 0
          let read = 0
          let write = 0
          for (const message of messages) {
            const t = message.tokens
            if (!t) continue
            input += t.input ?? 0
            output += t.output ?? 0
            reasoning += t.reasoning ?? 0
            read += t.cache?.read ?? 0
            write += t.cache?.write ?? 0
          }
          const total = input + output + reasoning + read + write
          if (total <= 0) return
          return { input, output, reasoning, read, write, total }
        })

        // 缓存率：cc-switch 口径 = read / (input + write + read)，一位小数
        const cacheRate = createMemo(() => {
          const u = usage()
          if (!u) return
          const denom = u.input + u.write + u.read
          if (denom <= 0) return
          return Math.round((u.read / denom) * 1000) / 10
        })

        // 上下文的实际占用：取最新一条 assistant 消息的 tokens 求和
        // （对齐内置 Context 显示口径，缓存读取是当前请求的上下文复用，不是累计）
        const ctxUsage = createMemo(() => {
          if (!sessionID) return
          const messages = ctx.data.session.message.list(sessionID) ?? []
          const last = [...messages].reverse().find((m) => m.tokens)
          if (!last?.tokens) return
          const t = last.tokens
          return (
            (t.input ?? 0) +
            (t.output ?? 0) +
            (t.reasoning ?? 0) +
            (t.cache?.read ?? 0) +
            (t.cache?.write ?? 0)
          )
        })

        // 上下文上限（进度条比例）
        const limit = createMemo(() => {
          if (!sessionID || !ctxUsage()) return
          const session = ctx.data.session.get(sessionID)
          if (!session) return
          const messages = ctx.data.session.message.list(sessionID) ?? []
          const last = [...messages].reverse().find((m) => m.model?.id)
          if (!last) return
          const models = ctx.data.location.model.list(session.location) ?? []
          return models.find((m) => m.id === last.model.id)?.limit?.context
        })

        const ctxPct = createMemo(() => {
          const total = ctxUsage()
          if (total === undefined || !limit()) return
          return Math.round((total / limit()!) * 1000) / 10
        })

        // ── 当前会话的供应商 ID（用于按供应商分桶查询额度） ──
        const providerID = createMemo(() => {
          if (!sessionID) return
          type Msg = { providerID?: string; model?: { id?: string; providerID?: string } }
          const messages = (ctx.data.session.message.list(sessionID) ?? []) as Msg[]
          const last = [...messages]
            .reverse()
            .find(
              (m) =>
                (typeof m?.providerID === "string" && m.providerID.length > 0) ||
                (typeof m?.model?.providerID === "string" && m.model.providerID.length > 0) ||
                (typeof m?.model?.id === "string" && m.model.id.length > 0),
            )
          if (!last) return undefined
          if (typeof last.providerID === "string" && last.providerID.length > 0) return last.providerID
          if (typeof last.model?.providerID === "string" && last.model.providerID.length > 0) return last.model.providerID
          if (typeof last.model?.id === "string" && last.model.id.length > 0) {
            const session = ctx.data.session.get(sessionID) as { location?: string } | undefined
            const models = session?.location ? (ctx.data.location.model.list(session.location) ?? []) : []
            const hit = (models.find((m: { id: string; providerID?: string }) => m.id === last.model!.id)?.providerID) as
              | string
              | undefined
            if (hit) return hit
            return undefined
          }
          return undefined
        })

        // ── 配额：按 providerID 分桶，字典缓存 ──
        const [quotaVer, setQuotaVer] = createSignal(0)
        const quota = createMemo(() => {
          void quotaVer()
          const pid = providerID()
          if (!pid) return
          // 仅支持已配置的供应商，未配置的直接不查（后续在 QUOTA_INTEGRATIONS / PROVIDER_API_URL 追加即可）
          if (!(QUOTA_INTEGRATIONS as readonly string[]).includes(pid) && !PROVIDER_API_URL[pid]) return
          return quotaCache.get(pid)
        })

        async function loadQuotaFor(pid: string) {
          if (!pid) return
          if (!(QUOTA_INTEGRATIONS as readonly string[]).includes(pid) && !PROVIDER_API_URL[pid]) return
          const now = Date.now()
          if (now - (quotaAt.get(pid) ?? 0) < QUOTA_REFRESH_MS) return
          if (quotaInFlight.has(pid)) return quotaInFlight.get(pid)
          const p = (async () => {
            const apiUrl = PROVIDER_API_URL[pid] ?? QUOTA_API_URL
            const key = await readProviderKey(pid)
            if (!key) {
              quotaAt.set(pid, now)
              void ctx.client.app
                .log({
                  body: {
                    service: "tui-usage",
                    level: "warn",
                    message: `quota ${pid} missing key`,
                  },
                })
                .catch(() => {})
              return
            }
            try {
              const usage = await fetchQuota(pid, apiUrl, key)
              if (usage) {
                quotaCache.set(pid, usage)
                quotaAt.set(pid, now)
                setQuotaVer((v: number) => v + 1)
              } else {
                quotaAt.set(pid, now)
                void ctx.client.app
                  .log({
                    body: {
                      service: "tui-usage",
                      level: "warn",
                      message: `quota ${pid} empty response`,
                    },
                  })
                  .catch(() => {})
              }
            } catch (e) {
              quotaAt.set(pid, now)
              void ctx.client.app
                .log({
                  body: {
                    service: "tui-usage",
                    level: "error",
                    message: `quota ${pid} fetch failed: ${String(e)}`,
                  },
                })
                .catch(() => {})
              return
            }
          })().finally(() => quotaInFlight.delete(pid))
          quotaInFlight.set(pid, p)
          await p
        }

        createEffect(() => {
          const pid = providerID()
          if (pid) void loadQuotaFor(pid)
        })
        const timer = setInterval(() => {
          const pid = providerID()
          if (pid) void loadQuotaFor(pid)
        }, QUOTA_REFRESH_MS)
        onCleanup(() => clearInterval(timer))

        // 进度条颜色：<50% 绿 → ≥50% 黄 → ≥85% 红
        function pctColor(pct: number | undefined) {
          if (pct === undefined) return theme.text.subdued
          if (pct >= PCT_ERROR_THRESHOLD) return ERROR_COLOR
          if (pct >= PCT_WARN_THRESHOLD) return WARN_COLOR
          return INPUT_COLOR
        }

        const quotaPct = (w: QuotaWindow | undefined) =>
          w?.status === "ok" && typeof w.percent === "number" ? w.percent : undefined

        // 百分比统一显示：1 位小数（如 34.8%）
        const fmtPct = (v: number | undefined) => (v !== undefined ? `${v.toFixed(1)}%` : "")
        // 占总量占比（百分数，1 位小数）：v / total × 100
        const sharePct = (v: number, total: number) => (total > 0 ? fmtPct((v / total) * 100) : "")
        // 额度百分比：API 返回整数，直接显示（42%）
        const fmtPctInt = (v: number | undefined) => (v !== undefined ? `${Math.round(v)}%` : "")

        return (
          <Show when={usage()}>
            {(u) => (
              <box flexDirection="column" gap={1}>
                <Collapsible
                  title={SECTION_CACHE_TITLE}
                  arrowColor={ARROW_COLOR}
                  titleColor={theme.text.default}
                  summaryColor={theme.text.subdued}
                  summary={<span>（{ctxPct() !== undefined ? fmtPct(ctxPct()) : fmtTokens(u().total)}）</span>}
                >
                  <box flexDirection="column" gap={0}>
                    <text fg={theme.text.default}>上下文</text>
                    <box flexDirection="row" gap={1}>
                      <ColorBar pct={ctxPct()} color={pctColor(ctxPct())} />
                      <text fg={theme.text.subdued}>{fmtPct(ctxPct())}</text>
                    </box>
                    <text fg={theme.text.subdued}>
                      {fmtTokens(ctxUsage() ?? 0)}
                      {limit() ? ` / ${fmtTokens(limit()!)}` : ""}
                      {ctxPct() !== undefined ? `  (${fmtPct(ctxPct())})` : ""}
                    </text>
                    <box height={1} />
                    <text wrapMode="none">
                      <span style={{ fg: theme.text.default }}>{padLabel("总量", LABEL_COL_WIDTH)}</span>
                      <span style={{ fg: theme.text.subdued }}>{fmtTokens(u().total)}</span>
                    </text>
                    <text wrapMode="none">
                      <span style={{ fg: theme.text.default }}>{padLabel("输入", LABEL_COL_WIDTH)}</span>
                      <span style={{ fg: theme.text.subdued }}>
                        {fmtTokens(u().input)}  ({sharePct(u().input, u().total)})
                      </span>
                    </text>
                    <text wrapMode="none">
                      <span style={{ fg: theme.text.default }}>{padLabel("输出", LABEL_COL_WIDTH)}</span>
                      <span style={{ fg: theme.text.subdued }}>
                        {fmtTokens(u().output)}  ({sharePct(u().output, u().total)})
                      </span>
                    </text>
                    <text wrapMode="none">
                      <span style={{ fg: theme.text.default }}>{padLabel("缓存读取", LABEL_COL_WIDTH)}</span>
                      <span style={{ fg: theme.text.subdued }}>
                        {fmtTokens(u().read)}  ({sharePct(u().read, u().total)})
                      </span>
                    </text>
                    <Show when={u().write > 0}>
                      <text wrapMode="none">
                        <span style={{ fg: theme.text.default }}>{padLabel("缓存写入", LABEL_COL_WIDTH)}</span>
                        <span style={{ fg: theme.text.subdued }}>
                          {fmtTokens(u().write)}  ({sharePct(u().write, u().total)})
                        </span>
                      </text>
                    </Show>
                    <Show when={u().reasoning > 0}>
                      <text wrapMode="none">
                        <span style={{ fg: theme.text.default }}>{padLabel("推理", LABEL_COL_WIDTH)}</span>
                        <span style={{ fg: theme.text.subdued }}>
                          {fmtTokens(u().reasoning)}  ({sharePct(u().reasoning, u().total)})
                        </span>
                      </text>
                    </Show>
                    <Show when={cacheRate() !== undefined}>
                      <text wrapMode="none">
                        <span style={{ fg: theme.text.default }}>{padLabel("命中率", LABEL_COL_WIDTH)}</span>
                        <span style={{ fg: theme.text.subdued }}>{fmtPct(cacheRate())}</span>
                      </text>
                    </Show>
                  </box>
                </Collapsible>

                <Collapsible
                  title={SECTION_QUOTA_TITLE}
                  arrowColor={ARROW_COLOR}
                  titleColor={theme.text.default}
                  summaryColor={theme.text.subdued}
                  summary={
                    <span>
                      （{quotaPct(quota()?.rolling) !== undefined ? `${QUOTA_LABELS[0]} ${fmtPctInt(quotaPct(quota()?.rolling))}` : ""}
                      {quotaPct(quota()?.weekly) !== undefined ? ` · ${QUOTA_LABELS[1]} ${fmtPctInt(quotaPct(quota()?.weekly))}` : ""}）
                    </span>
                  }
                >
                  <Show when={quota()?.rolling || quota()?.weekly || quota()?.monthly}>
                    <box flexDirection="column" gap={1}>
                      <box flexDirection="row" gap={1}>
                        <text fg={theme.text.default}>{QUOTA_LABELS[0]}</text>
                        <ColorBar pct={quotaPct(quota()?.rolling)} color={pctColor(quotaPct(quota()?.rolling))} />
                        <text fg={theme.text.subdued}>
                          {quotaPct(quota()?.rolling) !== undefined ? fmtPctInt(quotaPct(quota()?.rolling)) : ""}
                        </text>
                      </box>
                      <box flexDirection="row" gap={1}>
                        <text fg={theme.text.default}>{QUOTA_LABELS[1]}</text>
                        <ColorBar pct={quotaPct(quota()?.weekly)} color={pctColor(quotaPct(quota()?.weekly))} />
                        <text fg={theme.text.subdued}>
                          {quotaPct(quota()?.weekly) !== undefined ? fmtPctInt(quotaPct(quota()?.weekly)) : ""}
                        </text>
                      </box>
                      <box flexDirection="row" gap={1}>
                        <text fg={theme.text.default}>{QUOTA_LABELS[2]}</text>
                        <ColorBar pct={quotaPct(quota()?.monthly)} color={pctColor(quotaPct(quota()?.monthly))} />
                        <text fg={theme.text.subdued}>
                          {quotaPct(quota()?.monthly) !== undefined ? fmtPctInt(quotaPct(quota()?.monthly)) : ""}
                        </text>
                      </box>
                    </box>
                  </Show>
                </Collapsible>
              </box>
            )}
          </Show>
        )
      },
    })
  },
})