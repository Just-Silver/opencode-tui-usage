# 语言规则
- 全程中文沟通与中文 `git commit`

# 项目
- 单 TUI 插件仓库，非 monorepo，无 `package.json`/`README`/`opencode.json`，无构建/CI 配置
- 唯一插件：`.opencode/plugins/tui/opencode-tui-usage.tsx`（`Plugin.define id:"opencode-tui-usage"`，薄壳）+ 统一前缀子目录 `opencode-tui-usage/{model,quota,shared,view}/*` 视为单插件，`bun` 以入口打包，子模块仅被入口 `import`；MVVM 四层：`model/` 数据与纯函数（可单测）、`quota/` 查询服务（fetcher+凭据）、`shared/` 纯帮助函数、`view/` UI（Sidebar=ViewModel 编排）
- 不要在 `tui/` 下新增顶级 `*.tsx` 作为独立插件，会被当多插件加载

# 运行与验证
- 本地 `Bun 1.3.14`，`TUI` 依赖 `bun:sqlite` 读 `~/.local/share/opencode/opencode.db`
- 热重载：`B/~BUN/root/chunk-*.js?mtime` 内存打包，opencode2 动态加载，新增/重命名/删除/同名覆盖均无需重启
- 日志：`ctx.client.app.log({service:"tui-usage"})` 落 `~/.local/share/opencode/log/opencode.log`，`console.warn` 双写已统一为 `app.log` 单通道，失败统一 `60s` 限流不重试
- 校验：单元测试 `node --test tests/key.test.ts`（node ≥23.6 原生 TS strip，零依赖）；改后 `bun build <entry> --target bun` 仅缺 `@opencode-ai/plugin/tui` 预期错即算语法通过，`opencode` 启动侧边栏无 `sidebar.content` 崩溃即正常

# 关键逻辑
- `sidebar.content` 的 `render({sessionID})` 仅跟当前展示会话，空会话 `providerID` 返回 `undefined` 不查额度、有缓存 `Map<providerID,QuotaData>` 切回瞬时显示，子代理独立 `sessionID` 不进侧边栏不触发
- 额度按 `providerID` 分桶：`model/quota.ts` 的 `QuotaStore`（cache/at/inFlight，依赖注入可测）；供应商**自动发现**：`quota/providers/<name>.ts` 导出 `provider`（`{id, apiUrl, fetch, enabled?}`）即视为一个查询，`quota/index.ts` 经 `import.meta.glob` 收集后交给 `quota/registry.ts` 的 `createRegistry`（纯逻辑可测）推导白名单/URL/fetcher；白名单守卫与 fetcher 分发均经 `isQuotaProvider`/`normID` 按「小写+只留 [a-z]」归一化匹配（用户写法 `opencode-go`/`opencodego`/`opencode_go` 均命中），配置/DB 查找保持原样 pid（同源天然命中）；API URL 经 `getProviderApiUrl` 归一化查找（未启用/未注册落 `QUOTA_API_URL` 兜底）。**新增供应商 = 只新增 `providers/<name>.ts` 一个文件**（glob 打包期展开，`opencode2 service restart` 重新打包生效）；`enabled: false` 的已实现供应商不进白名单
- Command Code 已实现（`quota/providers/command-code.ts`：`mapCommandCode` 纯函数 + `fetchCommandCode` 双 API），**`enabled: false` 待验**（有真实订阅数据后改 `true` 即启用）；测试 `tests/command-code.test.ts` 离线覆盖转换逻辑
- 凭据解析统一在 `quota/key.ts`：`resolveProviderKey(pid)` 顺序 keyCache → 项目配置（近→远，同目录 `.opencode/` 优先）→ 全局配置（XDG_CONFIG_HOME 优先）→ DB credential 表兜底；支持 V2 `providers.{id}.settings.apiKey` / V1 `provider.{id}.options.apiKey` 与 `{env:VAR}` 占位符，模块零日志（脱敏：key 不落盘、不上报）
