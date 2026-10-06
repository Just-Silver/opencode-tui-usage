// ─── UI 层：额度区块（纯展示） ───
// 配色固定取 theme.ts 调色板（opencode 主题色，不随宿主主题）。
// ⚠️ 响应式约束：组件函数体只执行一次，禁止 props 快照 const；
//    所有取值必须发生在 JSX 表达式位置（Solid 编译器包装为响应式 getter）。
/** @jsxImportSource @opentui/solid */
import { Show, type JSX } from "solid-js"
import type { QuotaData } from "../model/types.ts"
import { fmtPctInt, quotaPct } from "../shared/format.ts"
import { ColorBar } from "./ColorBar.tsx"
import { Collapsible } from "./Collapsible.tsx"
import { MUTED_COLOR, pctColor, QUOTA_LABELS, SECTION_QUOTA_TITLE, TEXT_COLOR } from "./theme.ts"

// 百分比列宽（fmtPctInt 最长 "100%" = 4 列，定宽右对齐）
const PCT_WIDTH = 4

// 单行：窗口标签 + 进度条（flex 填充）+ 右对齐百分比
function QuotaRow(props: { label: string; pct: number | undefined }): JSX.Element {
  return (
    <box flexDirection="row" gap={1}>
      <text fg={TEXT_COLOR}>{props.label}</text>
      <ColorBar pct={props.pct} color={pctColor(props.pct)} />
      <text fg={pctColor(props.pct)}>{fmtPctInt(props.pct).padStart(PCT_WIDTH)}</text>
    </box>
  )
}

export function QuotaSection(props: { quota: QuotaData | undefined }): JSX.Element {
  // 惰性 getter（函数），在 JSX 位置调用才求值 → 随 props.quota 更新响应式重算
  const rollingPct = () => quotaPct(props.quota?.rolling)
  const weeklyPct = () => quotaPct(props.quota?.weekly)
  // 折叠摘要：只列有数据的窗口；全部缺失（如仅 monthly）→ undefined，不显示空 "（）"
  const summary = () => {
    const parts: string[] = []
    if (rollingPct() !== undefined) parts.push(`${QUOTA_LABELS[0]} ${fmtPctInt(rollingPct())}`)
    if (weeklyPct() !== undefined) parts.push(`${QUOTA_LABELS[1]} ${fmtPctInt(weeklyPct())}`)
    return parts.length > 0 ? `（${parts.join(" · ")}）` : undefined
  }
  return (
    <Show when={props.quota?.rolling || props.quota?.weekly || props.quota?.monthly}>
      <Collapsible title={SECTION_QUOTA_TITLE} summary={summary()}>
        <box flexDirection="column" gap={1}>
          <QuotaRow label={QUOTA_LABELS[0]} pct={rollingPct()} />
          <QuotaRow label={QUOTA_LABELS[1]} pct={weeklyPct()} />
          <QuotaRow label={QUOTA_LABELS[2]} pct={quotaPct(props.quota?.monthly)} />
        </box>
      </Collapsible>
    </Show>
  )
}
