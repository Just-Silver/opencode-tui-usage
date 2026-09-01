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
发版流程（Actions 自动出 Release）：
```bash
# 1. 改 .opencode/plugins/tui/opencode-tui-usage/update/version.ts 的 VERSION
# 2. 提交
git commit -m "发布 v1.1.0：..."
# 3. 打 tag 并推送（触发 Actions 创建 Release）
git tag v1.1.0
git push origin v1.1.0
```
> tag 与 `VERSION` 不一致时 Actions 会失败拦截，防止误发版。

