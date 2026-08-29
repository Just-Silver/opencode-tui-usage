// ─── UI 层：折叠区域组件 ───
// 参考内置 opencode.sidebar.mcp 的 g8t 实现：▼/▶ 箭头、粗体标题、整行 onMouseDown 切换、
// 折叠时显示摘要、状态持久化。
/** @jsxImportSource @opentui/solid */
import { createSignal, Show, type JSX } from "solid-js"

const collapseState = new Map<string, boolean>()

// 布局
const CONTENT_INDENT = 0 // 折叠内容缩进
const ARROW_COLOR = "#888" // 折叠箭头/摘要颜色

export function Collapsible(props: {
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
    <box flexDirection="column" gap={1}>
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