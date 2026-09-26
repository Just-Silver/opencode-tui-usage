// ─── 共享：路径解析（插件自己的本地应用数据目录） ───
// 各 OS 的「本地应用数据」目录（对齐 LocalApplicationData）：
//   Windows：%LOCALAPPDATA%（C:\Users\<user>\AppData\Local）
//   macOS  ：~/Library/Application Support
//   Linux  ：$XDG_DATA_HOME 或 ~/.local/share
// 插件所有持久文件（探针日志、更新检查缓存）都放这里，不与 opencode 自身的数据目录混放。
import { homedir } from "os"
import { join } from "path"

export function localAppDataDir(): string {
  if (process.platform === "win32") {
    const base = process.env.LOCALAPPDATA?.trim()
    return base ? base : join(homedir(), "AppData", "Local")
  }
  if (process.platform === "darwin") return join(homedir(), "Library", "Application Support")
  const xdg = process.env.XDG_DATA_HOME?.trim()
  return xdg ? xdg : join(homedir(), ".local", "share")
}

// 本插件专属数据目录：<localAppData>/opencode-tui-usage
export function pluginDataDir(): string {
  return join(localAppDataDir(), "opencode-tui-usage")
}
