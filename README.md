# opencode-tui-usage

TUI 侧边栏：上下文 / 缓存 / 额度。

## 安装
```bash
curl -fsSL https://raw.githubusercontent.com/Just-Silver/opencode-tui-usage/main/install.sh | bash
```

## 卸载
```bash
curl -fsSL https://raw.githubusercontent.com/Just-Silver/opencode-tui-usage/main/uninstall.sh | bash
```

## 发布新版本

插件启动时会对比本地版本与 GitHub 最新 Release，有新版本则侧边栏横幅提示。
发版流程（Actions 自动出 Release + 自动更新 CHANGELOG）：

```bash
# 1. 改 .opencode/plugins/tui/opencode-tui-usage/update/version.ts 的 VERSION
# 2. 提交（建议用约定式提交前缀，便于 CHANGELOG 归类）
git commit -m "feat: 新增 XX"
# 3. 打 tag 并推送（触发 Actions）
git tag v1.1.0
git push origin v1.1.0
```

Actions 自动完成：
- 校验 tag 与 `VERSION` 一致（不一致即 fail 拦截，防误发版）
- **git-cliff 生成 `CHANGELOG.md`**（按 Conventional Commits 归类：新功能/修复/重构…），提交回仓库
- 创建 Release，说明直接用 CHANGELOG

> CHANGELOG 遵循 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.1.0/)，版本遵循 [SemVer](https://semver.org/lang/zh-CN/)。

