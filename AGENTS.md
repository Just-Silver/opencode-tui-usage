# 语言规则
- 全程中文沟通与中文 `git commit`

# 项目
- 单 TUI 插件仓库，非 monorepo，无 `package.json`/`README`/`opencode.json`，无构建/测试/CI 配置
- 唯一插件：`.opencode/plugins/tui/opencode-tui-usage.tsx`（`Plugin.define id:"opencode-tui-usage"`）+ 统一前缀子目录 `opencode-tui-usage/quota/{index.ts,types.ts,opencode-go.ts}` 视为单插件，`bun` 以入口打包，子模块仅被入口 `import`
- 不要在 `tui/` 下新增顶级 `*.tsx` 作为独立插件，会被当多插件加载

# 运行与验证
- 本地 `Bun 1.3.14`，`TUI` 依赖 `bun:sqlite` 读 `~/.local/share/opencode/opencode.db`
- 热重载：`B/~BUN/root/chunk-*.js?mtime` 内存打包，同名覆盖自动热重载（无需重启）；仅重命名/新增/删除（`unlink+add`）需 `opencode2 service restart && opencode`，否则 `Cannot find module ...?mtime`
- 日志：`ctx.client.app.log({service:"tui-usage"})` 落 `~/.local/share/opencode/log/opencode.log`，`console.warn` 双写已统一为 `app.log` 单通道，失败统一 `60s` 限流不重试
- 校验：无 `npm test`；改后 `bun build <entry> --target bun` 仅缺 `@opencode-ai/plugin/tui` 预期错即算语法通过，`opencode` 启动侧边栏无 `sidebar.content` 崩溃即正常

# 关键逻辑
- `sidebar.content` 的 `render({sessionID})` 仅跟当前展示会话，空会话 `providerID` 返回 `undefined` 不查额度、有缓存 `Map<providerID,QuotaData>` 切回瞬时显示，子代理独立 `sessionID` 不进侧边栏不触发
- 额度按 `providerID` 分桶：`quotaCache/quotaAt/quotaInFlight: Map`，`PROVIDER_API_URL`/`QUOTA_INTEGRATIONS`/`fetchers` 集中在 `quota/index.ts`，加供应商只需在该文件追加
