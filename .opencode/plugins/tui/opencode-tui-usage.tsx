/** @jsxImportSource @opentui/solid */
import { Plugin } from "@opencode-ai/plugin/tui"
import { Sidebar } from "./opencode-tui-usage/view/Sidebar.tsx"

export default Plugin.define({
  id: "opencode-tui-usage",
  setup(context) {
    context.ui.slot({
      append: "sidebar.content",
      render: ({ sessionID }: { sessionID?: string }) => <Sidebar sessionID={sessionID} />,
    })
  },
})