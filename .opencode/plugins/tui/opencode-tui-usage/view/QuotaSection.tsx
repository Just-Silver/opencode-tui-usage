// ─── UI 层：额度区块（纯展示） ───
// ⚠️ 响应式约束：组件函数体只执行一次，禁止 props 快照 const；
//    所有取值必须发生在 JSX 表达式位置（Solid 编译器包装为响应式 getter）。
/** @jsxImportSource @opentui/solid */
import { Show, type JSX } from "solid-js"
import type { QuotaData } from "../model/types.ts"
import { fmtPctInt, quotaPct } from "../shared/format.ts"
import { ColorBar } from "./ColorBar.tsx"
import { Collapsible } from "./Collapsible.tsx"
import { pctColor, QUOTA_LABELS, SECTION_QUOTA_TITLE, type ThemeLike } from "./theme.ts"

export function QuotaSection(props: { theme: ThemeLike; quota: QuotaData | undefined }): JSX.Element {
  // 惰性 getter（函数），在 JSX 位置调用才求值 → 随 props.quota 更新响应式重算
  const rollingPct = () => quotaPct(props.quota?.rolling)
  const weeklyPct = () => quotaPct(props.quota?.weekly)
  return (
    <Collapsible
      title={SECTION_QUOTA_TITLE}
      arrowColor="#888"
      titleColor={props.theme.text.default}
      summaryColor={props.theme.text.subdued}
      summary={
        <span>
          （{rollingPct() !== undefined ? `${QUOTA_LABELS[0]} ${fmtPctInt(rollingPct())}` : ""}
          {weeklyPct() !== undefined ? ` · ${QUOTA_LABELS[1]} ${fmtPctInt(weeklyPct())}` : ""}）
        </span>
      }
    >
      <Show when={props.quota?.rolling || props.quota?.weekly || props.quota?.monthly}>
        <box flexDirection="column" gap={1}>
          <box flexDirection="row" gap={1}>
            <text fg={props.theme.text.default}>{QUOTA_LABELS[0]}</text>
            <ColorBar pct={rollingPct()} color={pctColor(props.theme, rollingPct())} />
            <text fg={props.theme.text.subdued}>{rollingPct() !== undefined ? fmtPctInt(rollingPct()) : ""}</text>
          </box>
          <box flexDirection="row" gap={1}>
            <text fg={props.theme.text.default}>{QUOTA_LABELS[1]}</text>
            <ColorBar pct={weeklyPct()} color={pctColor(props.theme, weeklyPct())} />
            <text fg={props.theme.text.subdued}>{weeklyPct() !== undefined ? fmtPctInt(weeklyPct()) : ""}</text>
          </box>
          <box flexDirection="row" gap={1}>
            <text fg={props.theme.text.default}>{QUOTA_LABELS[2]}</text>
            <ColorBar
              pct={quotaPct(props.quota?.monthly)}
              color={pctColor(props.theme, quotaPct(props.quota?.monthly))}
            />
            <text fg={props.theme.text.subdued}>
              {quotaPct(props.quota?.monthly) !== undefined ? fmtPctInt(quotaPct(props.quota?.monthly)) : ""}
            </text>
          </box>
        </box>
      </Show>
    </Collapsible>
  )
}