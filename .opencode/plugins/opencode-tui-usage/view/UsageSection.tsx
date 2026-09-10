// ─── UI 层：会话用量区块（纯展示） ───
// ⚠️ 响应式约束：组件函数体只执行一次，禁止 props 快照 const；
//    所有取值必须发生在 JSX 表达式位置（Solid 编译器包装为响应式 getter）。
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
  return (
    <Collapsible
      title={SECTION_CACHE_TITLE}
      arrowColor={ARROW_COLOR}
      titleColor={props.theme.text.default}
      summaryColor={props.theme.text.subdued}
      summary={<span>（{fmtTokens(props.usage.total)}）</span>}
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
          <text width={10} fg={props.theme.text.subdued}>{fmtTokens(props.usage.total)}</text>
          <text width={8} />
        </box>
        <box flexDirection="row" gap={1}>
          <text fg={props.theme.text.default}>输入</text>
          <box flexGrow={1} />
          <text width={10} fg={props.theme.text.subdued}>{fmtTokens(props.usage.input)}</text>
          <text width={8} fg={props.theme.text.subdued}>({sharePct(props.usage.input, props.usage.total)})</text>
        </box>
        <box flexDirection="row" gap={1}>
          <text fg={props.theme.text.default}>输出</text>
          <box flexGrow={1} />
          <text width={10} fg={props.theme.text.subdued}>{fmtTokens(props.usage.output)}</text>
          <text width={8} fg={props.theme.text.subdued}>({sharePct(props.usage.output, props.usage.total)})</text>
        </box>
        <box flexDirection="row" gap={1}>
          <text fg={props.theme.text.default}>缓存读取</text>
          <box flexGrow={1} />
          <text width={10} fg={props.theme.text.subdued}>{fmtTokens(props.usage.read)}</text>
          <text width={8} fg={props.theme.text.subdued}>({sharePct(props.usage.read, props.usage.total)})</text>
        </box>
        <Show when={props.usage.write > 0}>
          <box flexDirection="row" gap={1}>
            <text fg={props.theme.text.default}>缓存写入</text>
            <box flexGrow={1} />
            <text width={10} fg={props.theme.text.subdued}>{fmtTokens(props.usage.write)}</text>
            <text width={8} fg={props.theme.text.subdued}>({sharePct(props.usage.write, props.usage.total)})</text>
          </box>
        </Show>
        <Show when={props.usage.reasoning > 0}>
          <box flexDirection="row" gap={1}>
            <text fg={props.theme.text.default}>推理</text>
            <box flexGrow={1} />
            <text width={10} fg={props.theme.text.subdued}>{fmtTokens(props.usage.reasoning)}</text>
            <text width={8} fg={props.theme.text.subdued}>({sharePct(props.usage.reasoning, props.usage.total)})</text>
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