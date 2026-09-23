// no-op server 入口（必要）：纯 TUI-only 包会被 server 端跳过，导致 CLI 从 server 拿不到该插件、其 ./tui 也不会被加载。
// 本入口不触碰 context.ui（server 端 UI API 不存在），仅让包对 server 可见。
import { Plugin } from "@opencode/plugin"

export default Plugin.define({
  id: "opencode-tui-usage",
  setup() {},
})
