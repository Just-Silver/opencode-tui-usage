// ─── UI 层：折叠区域组件 ───
// 样式：箭头 + 橙金粗体标题成一行的标题行（折叠时摘要右对齐），标题下方一条
// 独立的分隔线（"─" 字符铺满宽度）；整行 onMouseDown 切换、状态持久化。
// 配色固定取 theme.ts 调色板（不随宿主主题）。
/** @jsxImportSource @opentui/solid */
import { createSignal, Show, type JSX } from "solid-js"
import { dividerLine } from "../shared/format.ts"
import { DIVIDER_COLOR, MUTED_COLOR, PRIMARY_COLOR } from "./theme.ts"

const collapseState = new Map<string, boolean>()

export function Collapsible(props: {
  title: string
  /** 折叠时显示在标题行右端的摘要（纯文本） */
  summary?: string
  children: JSX.Element
}): JSX.Element {
  const [isOpen, setIsOpen] = createSignal(collapseState.get(props.title) ?? true)
  const [rowWidth, setRowWidth] = createSignal(0)
  let rowEl: { width?: number } | undefined

  const toggle = () => {
    setIsOpen((v) => {
      const next = !v
      collapseState.set(props.title, next)
      return next
    })
  }

  return (
    <box flexDirection="column">
      {/* 标题行：箭头 + 标题（折叠态摘要靠右）；行宽由父级决定，onSizeChange 测量 */}
      <box
        flexDirection="row"
        gap={1}
        onMouseDown={toggle}
        ref={(el: { width?: number }) => {
          rowEl = el
        }}
        onSizeChange={() => {
          const w = rowEl?.width
          if (typeof w === "number" && w > 0) setRowWidth(w)
        }}
      >
        <text fg={MUTED_COLOR}>{() => (isOpen() ? "▼" : "▶")}</text>
        <text fg={PRIMARY_COLOR}>
          <b>{props.title}</b>
        </text>
        <Show when={!isOpen() && props.summary}>
          <box flexGrow={1} />
          <text fg={MUTED_COLOR}>{props.summary}</text>
        </Show>
      </box>
      {/* 标题下方的独立分隔线（字符线，1 行高，视觉纤细） */}
      <text fg={DIVIDER_COLOR}>{dividerLine(rowWidth())}</text>
      <Show when={isOpen()}>
        <box marginTop={1}>{props.children}</box>
      </Show>
    </box>
  )
}
