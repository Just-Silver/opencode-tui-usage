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
  "plugins": ["github:Just-Silver/opencode-tui-usage#v2.0.0"]
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

## 发布新版本

更新交给 opencode：未钉版本会在启动时刷新，手动更新用 `opencode plugin update <配置中的目标>`。

```bash
# 1. 改 .opencode/plugins/opencode-tui-usage/update/version.ts 的 VERSION
#    并同步 package.json 的 version 为同一值
# 2. 提交（建议用约定式提交前缀，便于 CHANGELOG 归类）
git commit -m "feat: 新增 XX"
# 3. 打 tag 并推送（触发 Actions）
git tag v2.0.0
git push origin v2.0.0
```

Actions 自动完成：
- 校验 tag == `VERSION` == `package.json.version`（不一致即 fail 拦截）
- **git-cliff 生成 `CHANGELOG.md`**（按 Conventional Commits 归类），提交回仓库
- 创建 Release，说明直接用 CHANGELOG

> CHANGELOG 遵循 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.1.0/)，版本遵循 [SemVer](https://semver.org/lang/zh-CN/)。
