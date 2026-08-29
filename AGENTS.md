# 语言规则
- 全程中文沟通与中文 `git commit`

# 项目
- 单 TUI 插件仓库，非 monorepo，无 `package.json`/`README`/`opencode.json`，无构建/CI 配置
- 唯一插件：`.opencode/plugins/tui/opencode-tui-usage.tsx`（`Plugin.define id:"opencode-tui-usage"`）+ 统一前缀子目录 `opencode-tui-usage/quota/{index.ts,types.ts,opencode-go.ts,key.ts}` 视为单插件，`bun` 以入口打包，子模块仅被入口 `import`；`key.ts` 为共享凭据解析模块，未来查询脚本可直接 import 复用
- 不要在 `tui/` 下新增顶级 `*.tsx` 作为独立插件，会被当多插件加载

# 运行与验证
- 本地 `Bun 1.3.14`，`TUI` 依赖 `bun:sqlite` 读 `~/.local/share/opencode/opencode.db`
- 热重载：`B/~BUN/root/chunk-*.js?mtime` 内存打包，opencode2 动态加载，新增/重命名/删除/同名覆盖均无需重启
- 日志：`ctx.client.app.log({service:"tui-usage"})` 落 `~/.local/share/opencode/log/opencode.log`，`console.warn` 双写已统一为 `app.log` 单通道，失败统一 `60s` 限流不重试
- 校验：单元测试 `node --test tests/key.test.ts`（node ≥23.6 原生 TS strip，零依赖）；改后 `bun build <entry> --target bun` 仅缺 `@opencode-ai/plugin/tui` 预期错即算语法通过，`opencode` 启动侧边栏无 `sidebar.content` 崩溃即正常

# 关键逻辑
- `sidebar.content` 的 `render({sessionID})` 仅跟当前展示会话，空会话 `providerID` 返回 `undefined` 不查额度、有缓存 `Map<providerID,QuotaData>` 切回瞬时显示，子代理独立 `sessionID` 不进侧边栏不触发
- 额度按 `providerID` 分桶：`quotaCache/quotaAt/quotaInFlight: Map`，`PROVIDER_API_URL`/`QUOTA_INTEGRATIONS`/`fetchers` 集中在 `quota/index.ts`，加供应商只需在该文件追加；白名单守卫与 fetcher 分发均经 `isQuotaProvider`/`normID` 按「小写+只留 [a-z]」归一化匹配（用户写法 `opencode-go`/`opencodego`/`opencode_go` 均命中），配置/DB 查找保持原样 pid（同源天然命中）
- 凭据解析统一在 `quota/key.ts`：`resolveProviderKey(pid)` 顺序 keyCache → 项目配置（近→远，同目录 `.opencode/` 优先）→ 全局配置（XDG_CONFIG_HOME 优先）→ DB credential 表兜底；支持 V2 `providers.{id}.settings.apiKey` / V1 `provider.{id}.options.apiKey` 与 `{env:VAR}` 占位符，模块零日志（脱敏：key 不落盘、不上报）
