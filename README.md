# opencode-tui-usage

OpenCode TUI 侧边栏插件：显示上下文占用/缓存率与多供应商额度（按 `providerID` 分桶，`60s` 轮询）。

## 安装（全局）

主推 `curl+bash`（`Linux/macOS/WSL/Git Bash`）：

```bash
curl -fsSL https://raw.githubusercontent.com/Just-Silver/opencode-tui-usage/main/install.sh | bash
```

`Windows PowerShell 7.6.5` 可选：

```powershell
irm https://raw.githubusercontent.com/Just-Silver/opencode-tui-usage/main/install.ps1 | iex
```

安装位置：`~/.config/opencode/plugins/tui/opencode-tui-usage.tsx` + `opencode-tui-usage/quota/*`（`$XDG_CONFIG_HOME` 优先），与项目内 `.opencode/plugins/tui` 结构一致（统一前缀单插件）。

装后：

```bash
opencode2 service restart && opencode
```

日志：`~/.local/share/opencode/log/opencode.log`（`service:tui-usage`）

## 卸载

```bash
curl -fsSL https://raw.githubusercontent.com/Just-Silver/opencode-tui-usage/main/uninstall.sh | bash
# 或 PowerShell
irm https://raw.githubusercontent.com/Just-Silver/opencode-tui-usage/main/uninstall.ps1 | iex
# 手动
rm -rf ~/.config/opencode/plugins/tui/opencode-tui-usage*
opencode2 service restart
```

## 手动安装

```bash
git clone https://github.com/Just-Silver/opencode-tui-usage.git
mkdir -p ~/.config/opencode/plugins/tui/opencode-tui-usage/quota
cp .opencode/plugins/tui/opencode-tui-usage.tsx ~/.config/opencode/plugins/tui/
cp -r .opencode/plugins/tui/opencode-tui-usage/quota ~/.config/opencode/plugins/tui/opencode-tui-usage/
```

## 说明

- 空会话不查额度，有缓存切回瞬时显示，无缓存不显示
- 失败统一 `60s` 限流，日志单条 `service:tui-usage` 含 `status`
- 详见 `AGENTS.md` 单插件前缀与热重载约束
