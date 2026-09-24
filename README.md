# opencode-tui-usage

TUI 侧边栏：上下文 / 缓存 / 额度。

## 安装

Linux / macOS（bash）：

```bash
curl -fsSL https://raw.githubusercontent.com/Just-Silver/opencode-tui-usage/main/install.sh | bash
```

Windows（PowerShell 7+）：

```powershell
irm https://raw.githubusercontent.com/Just-Silver/opencode-tui-usage/main/install.ps1 | iex
```

脚本会把插件整目录安装到全局插件目录（Linux/macOS 为 `~/.config/opencode/plugins/opencode-tui-usage/`，Windows 为 `%USERPROFILE%\.config\opencode\plugins\opencode-tui-usage\`），重启 opencode 生效。

## 更新

重新运行一次上面的安装脚本即可（脚本会以最新版原子替换旧目录），随后重启 opencode。

## 卸载

Linux / macOS（bash）：

```bash
curl -fsSL https://raw.githubusercontent.com/Just-Silver/opencode-tui-usage/main/uninstall.sh | bash
```

Windows（PowerShell 7+）：

```powershell
irm https://raw.githubusercontent.com/Just-Silver/opencode-tui-usage/main/uninstall.ps1 | iex
```
