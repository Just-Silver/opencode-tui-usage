# opencode-tui-usage

TUI 侧边栏：上下文 / 缓存 / 额度。

## 安装

在 `opencode.json(c)` 的 `plugins` 中加入一行，opencode 启动时会自动从 GitHub 安装：

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "plugins": ["Just-Silver/opencode-tui-usage"]
}
```

钉版本（可复现，推荐）：

```jsonc
{
  "plugins": ["github:Just-Silver/opencode-tui-usage#v2.0.1"]
}
```

> 未钉版本会跟随默认分支；钉 tag 后更新由 `opencode plugin update` 负责。

## 更新

```sh
opencode plugin update <配置中的目标>
```

或直接重启 opencode。

## 卸载

```sh
opencode plugin remove <配置中的目标>
```

或从 `plugins` 中删掉该行。

## 从旧版脚本迁移

曾用 `install.sh` / `install.ps1` 安装的用户：删除 `~/.config/opencode/plugins/opencode-tui-usage/`，按上面的「安装」写入配置行，重启 opencode。
