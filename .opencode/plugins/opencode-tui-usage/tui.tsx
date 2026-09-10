/** @jsxImportSource @opentui/solid */
import { Plugin } from "@opencode/plugin/tui"
import { Sidebar } from "./view/Sidebar.tsx"

export default Plugin.define({
  id: "opencode-tui-usage",
  setup(context) {
    context.ui.slot({
      append: "sidebar.content",
      render: ({ sessionID }: { sessionID?: string }) => <Sidebar sessionID={sessionID} />,
    })
  },
})