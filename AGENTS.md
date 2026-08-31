# 语言规则
- 全程中文沟通与中文 `git commit`

# 项目
- 单 TUI 插件仓库，非 monorepo，无 `package.json`/`README`/`opencode.json`，无构建/CI 配置
- 唯一插件：`.opencode/plugins/tui/opencode-tui-usage.tsx`（`Plugin.define id:"opencode-tui-usage"`，薄壳）+ 统一前缀子目录 `opencode-tui-usage/{model,quota,shared,view}/*` 视为单插件，`bun` 以入口打包，子模块仅被入口 `import`；MVVM 四层：`model/` 数据与纯函数（可单测）、`quota/` 查询服务（fetcher+凭据）、`shared/` 纯帮助函数、`view/` UI（Sidebar=ViewModel 编排）
- 不要在 `tui/` 下新增顶级 `*.tsx` 作为独立插件，会被当多插件加载

# 运行与验证
- 本地 `Bun 1.3.14`，`TUI` 依赖 `bun:sqlite` 读 `~/.local/share/opencode/opencode.db`
- 热重载：`B/~BUN/root/chunk-*.js?mtime` 内存打包，opencode2 动态加载，新增/重命名/删除/同名覆盖均无需重启
- 日志：TUI 插件**无 `app.log`**（client 为 HTTP 客户端；旧文档 `ctx.client.app.log` 会直接崩溃，已踩坑）。`console` 被 TUI 全屏覆盖**不可见**（不进 opencode.log）。诊断走文件日志 `~/.local/share/opencode/log/tui-usage.log`：**默认禁用零开销**，排查时 `$env:TUI_USAGE_PROBE="1"; opencode` 启用（TUI 插件跑在客户端进程），文件超 1MB 自动重建（官方 opencode.log 无限 append 无任何清理，我们自管）；失败统一 `60s` 限流不重试
- 校验：单元测试 `node --test tests/*.test.ts`（node ≥23.6 原生 TS strip，零依赖；7 个文件：key/quota/model/quota-store/shared/command-code/discovery，全部须过）；改后打包语法检查用 esbuild：`npx --yes esbuild .opencode/plugins/tui/opencode-tui-usage.tsx --bundle --platform=node --format=esm --jsx=automatic --jsx-import-source=@opentui/solid --external:@opencode-ai/plugin/tui --external:@opentui/solid --external:solid-js --outfile=$env:TEMP\opencode\tui-bundle-check.js`（`Done in` 即通过）；`opencode` 启动侧边栏无 `sidebar.content` 崩溃即正常
- 官方源码速查：v2 仓库 = `sst/opencode`（TS monorepo，**`opencode-ai/opencode` 已归档勿用**）；日志实现 `packages/core/src/observability/logging.ts`（`Logger.toFile(..., { flag: "a" })`，**opencode.log 无轮转/截断/清理**）；查代码用 sparse clone 绕过 GitHub code search 对超大仓库的截断：`git clone --depth 1 --filter=blob:none --sparse <url> && git -C <dir> sparse-checkout set packages/core packages/tui`

# opencode2 版本与插件加载（上游回归，2026-08-31 实锤）
- **已知回归**：beta 通道 `0.0.0-beta-18721` 起 TUI/CLI 本地插件**完全不加载**——`cli.json` `plugins`（`file://` 目录/文件、相对路径）、`tui.json` `plugin` 数组、官方目录布局 `plugins/<name>/index.tsx` **全部无效**；特征是**静默失败零日志**（opencode.log 无插件痕迹、plugin-meta.json 不存在、任何 log level 都查不到，均非配置问题）。上游 issue：#42051（cli.json 迁移后插件配置被忽略，OPEN）、#41574（失败零日志）、#42763/#43644（Windows 路径 import）、#46095（解析缓存毒化）；修复 PR #42485 未合并
- **最后一个无 bug 版本：`0.0.0-beta-18707`（2026-08-31 01:12 构建）**；更早 18593/18600/18684（8/28-8/29）同样正常。**18721（8/31 07:28 构建）及之后的 beta 全部中招**；`latest`/`next` tag（0.0.0-beta-17823）同样有回归勿用；`1.18.x` 不是 V2 勿装
- 版本管理：npm 全局 `@opencode-ai/cli`。降级：`npm install -g @opencode-ai/cli@0.0.0-beta-18707`（写死版本号，**不要用 tag**——beta tag 天天更新）；升回：等 #42051/PR #42485 合并后 `npm install -g @opencode-ai/cli@beta`
- **禁止自升级**：全局 `~/.config/opencode/opencode.json` 配 `"autoupdate": false`（`"notify"` 只提示不装；**项目级值被忽略必须放全局**）。本次 18707→18721 即自升级所为（日志每次启动 `update check`，npm 包时间戳两次变化）
- 排查提示：升级 opencode2 后侧边栏插件消失且零日志 = 先查版本号是否 ≥18721，再怀疑配置；禁升级配置后验版本 `opencode2 --version`

# 关键逻辑
- `sidebar.content` 的 `render({sessionID})` 仅跟当前展示会话，空会话 `providerID` 返回 `undefined` 不查额度、有缓存 `Map<providerID,QuotaData>` 切回瞬时显示，子代理独立 `sessionID` 不进侧边栏不触发
- 额度按 `providerID` 分桶：`model/quota.ts` 的 `QuotaStore`（cache/at/inFlight + **subscribe 写库通知**，依赖注入可测；`load(pid, {force})` 供轮询绕过 60s 限流，Sidebar 订阅的是当前组件实例，跨 render 重建不丢刷新）；供应商**运行时自动发现**（opencode 源码确认：TUI 插件为 bun 运行时逐文件动态 import，无打包器/glob）：`quota/index.ts` 顶层 await 用 fs 扫描 + 动态 import 收集 `quota/providers/<name>.ts` 导出 `provider` 的模块，交 `quota/registry.ts` 的 `createRegistry`（纯逻辑可测）推导白名单/URL/fetcher；白名单守卫与 fetcher 分发均经 `isQuotaProvider`/`normID` 按「小写+只留 [a-z]」归一化匹配（用户写法 `opencode-go`/`opencodego`/`opencode_go` 均命中），配置/DB 查找保持原样 pid（同源天然命中）；API URL 经 `getProviderApiUrl` 归一化查找（未启用/未注册落 `QUOTA_API_URL` 兜底）。**新增供应商 = 只需新增 `providers/<name>.ts` 一个文件，热重载即生效**
- 新增供应商模板（照抄 `quota/providers/opencode-go.ts`）：文件导出 `provider: {id, apiUrl, enabled?, fetch}`——`id` 任意写法（白名单归一化匹配）；`apiUrl` 用 `QUOTA_API_URL` 或自定义端点；`fetch(apiUrl, key): Promise<QuotaData | undefined>` 返回扁平 `QuotaData = {rolling?, weekly?, monthly?}`（各窗口 `{status?, percent?}`，percent 0-100 整数），`key` 由调用方经 `resolveProviderKey(id)` 注入（**仅用于 Authorization 头，不落盘不上报**）；`enabled` 默认 true，`enabled: false` = 已实现待验不激活（跳过白名单，如 Command Code）
- 功能开关一览：`TUI_USAGE_PROBE=1` 探针文件日志（默认关，见「运行与验证」日志行）；`QUOTA_API_URL` 未注册供应商 API URL 兜底；供应商级 `enabled: false` 跳过白名单（Command Code 当前如此，待验后改 `true`）
- Command Code 已实现（`quota/providers/command-code.ts`：`mapCommandCode` 纯函数 + `fetchCommandCode` 双 API），**`enabled: false` 待验**（有真实订阅数据后改 `true` 即启用）；测试 `tests/command-code.test.ts` 离线覆盖转换逻辑
- 凭据解析统一在 `quota/key.ts`：`resolveProviderKey(pid)` 顺序 keyCache → 项目配置（近→远，同目录 `.opencode/` 优先）→ 全局配置（XDG_CONFIG_HOME 优先）→ DB credential 表兜底；支持 V2 `providers.{id}.settings.apiKey` / V1 `provider.{id}.options.apiKey` 与 `{env:VAR}` 占位符，模块零日志（脱敏：key 不落盘、不上报）

# UI 硬约束（Solid 响应式）
- **组件函数体只执行一次**：禁止 `const q = props.xxx` 这类 props 快照 const——挂载后 props 更新不生效（历史 bug：QuotaSection/UsageSection/ColorBar 均踩过，额度不显示、压缩上下文后进度条不刷新皆源于此）
- 取值必须发生在 **JSX 表达式位置**（Solid 编译器包装为响应式 getter），或惰性函数（`const pct = () => quotaPct(props.quota?.rolling)`）在 JSX 内调用
- 组件文件头部已含此约束注释；新增展示组件时必须遵守
