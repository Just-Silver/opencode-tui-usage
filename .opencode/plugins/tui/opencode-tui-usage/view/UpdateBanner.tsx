// ─── UI 层：更新提示（轻量、可关闭、不占空间） ───
// ⚠️ 响应式约束：组件函数体只执行一次，禁止 props 快照 const。
// 设计原则：提示不应当影响插件正常使用。
//   - 单行窄条（不换行、不撑高），置于插件最下方
//   - 右侧提供 ✕ 关闭按钮（点击即消失，本会话内不再出现）
//   - 无更新 / 检查失败 / 已关闭 → 零占位（完全不渲染）
// 展示：⚡ v1.1.0 可用 · 重跑 install.sh [✕]
/** @jsxImportSource @opentui/solid */
import { createSignal, Show, type JSX } from "solid-js"
import { checkForUpdate, type UpdateInfo } from "../update/index.ts"
import type { ThemeLike } from "./theme.ts"

const BANNER_FG = "#ffd93d" // 亮黄字（与 WARN_COLOR 同系）
const BANNER_DIM = "#a8a8a8" // 关闭按钮暗色
const CLOSE_LABEL = "✕"

// 模块级关闭标记：会话内关闭一次即不再打扰（跨组件重建保持）
let dismissed = false

export function UpdateBanner(props: { theme: ThemeLike }): JSX.Element {
  // 信号驱动：真实检查，异步完成后写入；无更新/失败 → undefined → 不渲染
  const [update, setUpdate] = createSignal<UpdateInfo | undefined>(undefined)

  // mount 时检查一次（Sidebar 生命周期内只触发一次）
  void checkForUpdate().then((info) => {
    setUpdate(info)
  })

  // 关闭：置空信号 + 置模块级标记（本次会话不再出现）
  const dismiss = () => {
    dismissed = true
    setUpdate(undefined)
  }

  // 无更新 / 已关闭 → 不渲染（零占位）
  // when 直接传 update()（对象）→ Show 回调拿到的是对象；dismissed 在内部判
  return (
    <Show when={update()}>
      {(u) =>
        dismissed ? null : (
          <box
            flexDirection="row"
            gap={1}
            height={1} // 单行不撑高
            alignItems="center"
          >
            <text fg={BANNER_FG}>⚡ v{u().latestVersion} 可用 · 重跑 install.sh</text>
            <text fg={BANNER_DIM} onMouseDown={dismiss} cursor="pointer">
              {CLOSE_LABEL}
            </text>
          </box>
        )
      }
    </Show>
  )
}
