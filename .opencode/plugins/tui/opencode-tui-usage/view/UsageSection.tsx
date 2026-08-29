// ─── UI 层：会话用量区块（纯展示） ───
/** @jsxImportSource @opentui/solid */
import { Show, type JSX } from "solid-js"
import type { UsageData } from "../model/types.ts"
import { fmtPct, fmtTokens, sharePct } from "../shared/format.ts"
import { ColorBar } from "./ColorBar.tsx"
import { Collapsible } from "./Collapsible.tsx"
import { pctColor, SECTION_CACHE_TITLE, type ThemeLike } from "./theme.ts"

const ARROW_COLOR = "#888" // 折叠箭头/摘要颜色

export function UsageSection(props: {
  theme: ThemeLike
  usage: UsageData
  ctxUsage: number | undefined
  ctxPct: number | undefined
  limit: number | undefined
  cacheRate: number | undefined
}): JSX.Element {
  const u = props.usage
  return (
    <Collapsible
      title={SECTION_CACHE_TITLE}
      arrowColor={ARROW_COLOR}
      titleColor={props.theme.text.default}
      summaryColor={props.theme.text.subdued}
      summary={<span>（{fmtTokens(u.total)}）</span>}
    >
      <box flexDirection="column" gap={0}>
        <text fg={props.theme.text.default}>上下文</text>
        <box flexDirection="row" gap={1}>
          <ColorBar pct={props.ctxPct} color={pctColor(props.theme, props.ctxPct)} />
          <text fg={props.theme.text.subdued}>{fmtPct(props.ctxPct)}</text>
        </box>
        <text fg={props.theme.text.subdued}>
          {fmtTokens(props.ctxUsage ?? 0)}
          {props.limit ? ` / ${fmtTokens(props.limit)}` : ""}
          {props.ctxPct !== undefined ? `  (${fmtPct(props.ctxPct)})` : ""}
        </text>
        <box flexDirection="row" gap={1}>
          <text fg={props.theme.text.default}>总量</text>
          <box flexGrow={1} />
          <text width={10} fg={props.theme.text.subdued}>{fmtTokens(u.total)}</text>
          <text width={8} />
        </box>
        <box flexDirection="row" gap={1}>
          <text fg={props.theme.text.default}>输入</text>
          <box flexGrow={1} />
          <text width={10} fg={props.theme.text.subdued}>{fmtTokens(u.input)}</text>
          <text width={8} fg={props.theme.text.subdued}>({sharePct(u.input, u.total)})</text>
        </box>
        <box flexDirection="row" gap={1}>
          <text fg={props.theme.text.default}>输出</text>
          <box flexGrow={1} />
          <text width={10} fg={props.theme.text.subdued}>{fmtTokens(u.output)}</text>
          <text width={8} fg={props.theme.text.subdued}>({sharePct(u.output, u.total)})</text>
        </box>
        <box flexDirection="row" gap={1}>
          <text fg={props.theme.text.default}>缓存读取</text>
          <box flexGrow={1} />
          <text width={10} fg={props.theme.text.subdued}>{fmtTokens(u.read)}</text>
          <text width={8} fg={props.theme.text.subdued}>({sharePct(u.read, u.total)})</text>
        </box>
        <Show when={u.write > 0}>
          <box flexDirection="row" gap={1}>
            <text fg={props.theme.text.default}>缓存写入</text>
            <box flexGrow={1} />
            <text width={10} fg={props.theme.text.subdued}>{fmtTokens(u.write)}</text>
            <text width={8} fg={props.theme.text.subdued}>({sharePct(u.write, u.total)})</text>
          </box>
        </Show>
        <Show when={u.reasoning > 0}>
          <box flexDirection="row" gap={1}>
            <text fg={props.theme.text.default}>推理</text>
            <box flexGrow={1} />
            <text width={10} fg={props.theme.text.subdued}>{fmtTokens(u.reasoning)}</text>
            <text width={8} fg={props.theme.text.subdued}>({sharePct(u.reasoning, u.total)})</text>
          </box>
        </Show>
        <Show when={props.cacheRate !== undefined}>
          <box flexDirection="row" gap={1}>
            <text fg={props.theme.text.default}>缓存命中率</text>
            <box flexGrow={1} />
            <text width={10} fg={props.theme.text.subdued}>{fmtPct(props.cacheRate)}</text>
            <text width={8} />
          </box>
        </Show>
      </box>
    </Collapsible>
  )
}