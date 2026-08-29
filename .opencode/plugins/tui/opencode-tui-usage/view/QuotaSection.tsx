// ─── UI 层：额度区块（纯展示） ───
/** @jsxImportSource @opentui/solid */
import { Show, type JSX } from "solid-js"
import type { QuotaData } from "../model/types.ts"
import { fmtPctInt, quotaPct } from "../shared/format.ts"
import { ColorBar } from "./ColorBar.tsx"
import { Collapsible } from "./Collapsible.tsx"
import { pctColor, QUOTA_LABELS, SECTION_QUOTA_TITLE, type ThemeLike } from "./theme.ts"

export function QuotaSection(props: { theme: ThemeLike; quota: QuotaData | undefined }): JSX.Element {
  const q = props.quota
  const rollingPct = quotaPct(q?.rolling)
  const weeklyPct = quotaPct(q?.weekly)
  return (
    <Collapsible
      title={SECTION_QUOTA_TITLE}
      arrowColor="#888"
      titleColor={props.theme.text.default}
      summaryColor={props.theme.text.subdued}
      summary={
        <span>
          （{rollingPct !== undefined ? `${QUOTA_LABELS[0]} ${fmtPctInt(rollingPct)}` : ""}
          {weeklyPct !== undefined ? ` · ${QUOTA_LABELS[1]} ${fmtPctInt(weeklyPct)}` : ""}）
        </span>
      }
    >
      <Show when={q?.rolling || q?.weekly || q?.monthly}>
        <box flexDirection="column" gap={1}>
          <box flexDirection="row" gap={1}>
            <text fg={props.theme.text.default}>{QUOTA_LABELS[0]}</text>
            <ColorBar pct={rollingPct} color={pctColor(props.theme, rollingPct)} />
            <text fg={props.theme.text.subdued}>{rollingPct !== undefined ? fmtPctInt(rollingPct) : ""}</text>
          </box>
          <box flexDirection="row" gap={1}>
            <text fg={props.theme.text.default}>{QUOTA_LABELS[1]}</text>
            <ColorBar pct={weeklyPct} color={pctColor(props.theme, weeklyPct)} />
            <text fg={props.theme.text.subdued}>{weeklyPct !== undefined ? fmtPctInt(weeklyPct) : ""}</text>
          </box>
          <box flexDirection="row" gap={1}>
            <text fg={props.theme.text.default}>{QUOTA_LABELS[2]}</text>
            <ColorBar pct={quotaPct(q?.monthly)} color={pctColor(props.theme, quotaPct(q?.monthly))} />
            <text fg={props.theme.text.subdued}>
              {quotaPct(q?.monthly) !== undefined ? fmtPctInt(quotaPct(q?.monthly)) : ""}
            </text>
          </box>
        </box>
      </Show>
    </Collapsible>
  )
}