// ─── UI 层：更新提示横幅 ───
// ⚠️ 响应式约束：组件函数体只执行一次，禁止 props 快照 const；
//    所有取值必须发生在 JSX 表达式位置（Solid 编译器包装为响应式 getter）。
// 无更新 / 检查失败 / 无本地版本 → 不渲染（零占位，不打扰）。
// 展示：⚡ 插件 v1.1.0 已发布 → 重跑 install.sh 更新
/** @jsxImportSource @opentui/solid */
import { createSignal, Show, type JSX } from "solid-js"
import { checkForUpdate, type UpdateInfo } from "../update/index.ts"
import type { ThemeLike } from "./theme.ts"

const BANNER_BG = "#3d3d00" // 暗黄底
const BANNER_FG = "#ffd93d" // 亮黄字（与 WARN_COLOR 同系）
const BANNER_ACCENT = "#ffd93d"

export function UpdateBanner(props: { theme: ThemeLike }): JSX.Element {
  // 信号驱动：checkForUpdate 异步完成后写入，JSX 位置读取即响应式
  const [update, setUpdate] = createSignal<UpdateInfo | undefined>(undefined)
  const [done, setDone] = createSignal(false)

  // mount 时检查一次（Sidebar 生命周期内只触发一次）
  void checkForUpdate().then((info) => {
    setUpdate(info)
    setDone(true)
  })

  return (
    <Show when={update()}>
      {(u) => (
        <box
          flexDirection="row"
          gap={1}
          paddingX={1}
          paddingY={1}
          backgroundColor={BANNER_BG}
          borderColor={BANNER_ACCENT}
          borderStyle="round"
        >
          <text fg={BANNER_FG}>⚡</text>
          <text fg={BANNER_FG}>
            插件 v{u().latestVersion} 已发布 → 重跑 <b>install.sh</b> 更新
          </text>
        </box>
      )}
    </Show>
  )
}
