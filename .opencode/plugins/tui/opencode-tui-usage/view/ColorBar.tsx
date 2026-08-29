// ─── UI 层：进度条组件 ───
// ⚠️ 响应式约束：组件函数体只执行一次，禁止 props 快照 const；
//    所有取值必须发生在 JSX 表达式位置（Solid 编译器包装为响应式 getter）。
// 进度条：flex 比例填充 + 轨道底色，完整长度可见
// （轨道底色标出全长，即使 8% 也能看出占比；1 行高度不用 border，避免 border 占掉内容区）
/** @jsxImportSource @opentui/solid */
import { Show, type JSX } from "solid-js"

export function ColorBar(props: { pct: number | undefined; color: string }): JSX.Element {
  // 惰性纯函数：在 JSX 表达式位置调用才求值 → 随 props.pct 更新响应式重算
  const clamped = (p: number | undefined) => (p === undefined ? 0 : Math.max(0, Math.min(100, p)))
  return (
    <Show when={props.pct !== undefined}>
      <box flexDirection="row" flexGrow={1} flexShrink={0} minWidth={0} height={1} backgroundColor="#2e2e2e">
        <box backgroundColor={props.color} flexGrow={clamped(props.pct)} flexShrink={0} />
        <box flexGrow={100 - clamped(props.pct)} flexShrink={0} />
      </box>
    </Show>
  )
}