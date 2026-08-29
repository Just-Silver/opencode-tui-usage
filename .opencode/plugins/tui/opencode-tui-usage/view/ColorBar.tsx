// ─── UI 层：进度条组件 ───
// 进度条：flex 比例填充 + 轨道底色，完整长度可见
// （轨道底色标出全长，即使 8% 也能看出占比；1 行高度不用 border，避免 border 占掉内容区）
/** @jsxImportSource @opentui/solid */
import type { JSX } from "solid-js"

export function ColorBar(props: { pct: number | undefined; color: string }): JSX.Element {
  const p = props.pct
  if (p === undefined) return null
  const clamped = Math.max(0, Math.min(100, p))
  return (
    <box flexDirection="row" flexGrow={1} flexShrink={0} minWidth={0} height={1} backgroundColor="#2e2e2e">
      <box backgroundColor={props.color} flexGrow={clamped} flexShrink={0} />
      <box flexGrow={100 - clamped} flexShrink={0} />
    </box>
  )
}