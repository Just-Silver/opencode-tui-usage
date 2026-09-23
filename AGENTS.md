# 语言规则
- 全程中文沟通与中文 `git commit`

# 项目
- 单 TUI 插件仓库，非 monorepo；**分发为配置安装**：根 `package.json` 暴露 `exports["./server"]`（no-op）与 `exports["./tui"]` → `.opencode/plugins/opencode-tui-usage/{server,tui}.tsx`，不发布 npm registry（CI 仅 `.github/workflows/release.yml` 发版）
- 唯一插件：`.opencode/plugins/opencode-tui-usage/`（目录型插件，`Plugin.define id:"opencode-tui-usage"`），入口 `tui.tsx`（TUI 入口，薄壳，import `@opencode/plugin/tui`）+ 同目录子模块 `{model,quota,shared,view,update}/*` 视为单插件，子模块仅被入口 `import`；MVVM 四层：`model/` 数据与纯函数（可单测）、`quota/` 查询服务（fetcher+凭据）、`shared/` 纯帮助函数、`view/` UI（Sidebar=ViewModel 编排）、`update/` 版本常量
- 布局硬约束（opencode2 ≥ beta-18721 发现器）：插件必须是 `.opencode/plugins/`（或 `plugin/`）的**直接子目录**，目录内 `tui.tsx` = TUI 入口（`index.ts`/`server.ts` = server 入口）；**不可**再嵌套（旧 `plugins/tui/opencode-tui-usage.tsx` 形态在 19425 上不被发现、不加载）；直接子 `.tsx` 文件也不会被发现（只认 `.ts`/`.js`）。
- 入口为 `tui.tsx`（TUI，import `@opencode/plugin/tui`）+ `server.ts`（**no-op** server 入口，import `@opencode/plugin`，**不得触碰 `context.ui`**）：实测纯 TUI-only 包会被 server 跳过、CLI 拿不到，配置安装失效，故必须有 server 入口

# 分发安装
- 唯一安装方式：`opencode.json(c)` 的 `"plugins": ["Just-Silver/opencode-tui-usage"]`（钉版本用 `github:Just-Silver/opencode-tui-usage#vX.Y.Z`）；opencode 启动时经 arborist 从 GitHub 按需安装到 global.cache
- 更新 `opencode plugin update <目标>` / 卸载 `opencode plugin remove <目标>`；**目标是配置里的那串 spec 原样**（如 `Just-Silver/opencode-tui-usage` 或 `github:Just-Silver/opencode-tui-usage#vX.Y.Z`），非包名、非路径（依 `plugin update --help` 的 "configured package target"）
- 旧件 install.sh/install.ps1/uninstall.sh/uninstall.ps1 已删除，不再维护

# 发版
- 版本单一事实源：`.opencode/plugins/opencode-tui-usage/update/version.ts` 的 `VERSION`（SemVer）
- 版本三方一致：tag == update/version.ts 的 VERSION == package.json.version（release.yml 校验）；VERSION 为运行时唯一事实源，package.json.version 为其镜像
- 更新交由 opencode：`opencode plugin update <配置中的目标>`；插件自身不再做更新检查
- 流程：改 `VERSION`（并同步 `package.json` 的 `version`）→ commit → `git tag vX.Y.Z` → `git push origin vX.Y.Z` → `.github/workflows/release.yml` 自动创建 Release（校验 tag == VERSION == package.json.version，不一致即 fail 拦截）

# 运行与验证
- 本地 `Bun 1.3.14`，`TUI` 依赖 `bun:sqlite` 读 `~/.local/share/opencode/opencode.db`
- 热重载：`B/~BUN/root/chunk-*.js?mtime` 内存打包，opencode2 动态加载，新增/重命名/删除/同名覆盖均无需重启
- 日志：TUI 插件**无 `app.log`**（client 为 HTTP 客户端；旧文档 `ctx.client.app.log` 会直接崩溃，已踩坑）。`console` 被 TUI 全屏覆盖**不可见**（不进 opencode.log）。诊断走文件日志 `~/.local/share/opencode/log/tui-usage.log`：**默认禁用零开销**，排查时 `$env:TUI_USAGE_PROBE="1"; opencode` 启用（TUI 插件跑在客户端进程），文件超 1MB 自动重建（官方 opencode.log 无限 append 无任何清理，我们自管）；失败统一 `60s` 限流不重试
- 校验：单元测试 `node --test tests/*.test.ts`（node ≥23.6 原生 TS strip，零依赖；8 个文件：key/quota/model/quota-store/shared/command-code/discovery/package，全部须过）；改后打包语法检查用 esbuild：`npx --yes esbuild .opencode/plugins/opencode-tui-usage/tui.tsx --bundle --platform=node --format=esm --jsx=automatic --jsx-import-source=@opentui/solid --external:@opencode/plugin/tui --external:@opentui/solid --external:solid-js --outfile=$env:TEMP\opencode\tui-bundle-check.js`（`Done in` 即通过）；`opencode` 启动侧边栏无 `sidebar.content` 崩溃即正常
- 官方源码速查：v2 仓库 = `sst/opencode`（TS monorepo，**`opencode-ai/opencode` 已归档勿用**）；日志实现 `packages/core/src/observability/logging.ts`（`Logger.toFile(..., { flag: "a" })`，**opencode.log 无轮转/截断/清理**）；查代码用 sparse clone 绕过 GitHub code search 对超大仓库的截断：`git clone --depth 1 --filter=blob:none --sparse <url> && git -C <dir> sparse-checkout set packages/core packages/tui`

# opencode2 版本与插件加载
- **当前推荐版本 `0.0.0-beta-19425`（2026-09-10）已实测可加载本插件**（本文档即修复于 19425）；**`2.0.15`（2026-09-24）亦实测可加载，且配置安装生效（前提见下条）**
- 19425 双层变化（相对 18707，实测）：
  1. **包名改名**：运行时注入的插件模块由 `@opencode-ai/plugin/tui` 改为 `@opencode/plugin/tui`（**无兼容重映射**，旧名 import 直接 ResolveMessage 失败）；npm 主包同时 `@opencode-ai/cli` → `@opencode/cli`
  2. **目录型插件布局**：发现器只扫 `plugins/`（与 `plugin/`）**直接子项**；直接子 `.ts`/`.js` = 文件插件；直接子目录 = 目录插件，入口经解析器取 `tui.tsx`（TUI）/`index.*`、`server.*`（server）。旧的嵌套 `plugins/tui/opencode-tui-usage.tsx` 形态在 19425 上**既不被服务端也不被 TUI 加载**（探针实测空日志）。直接子 `.tsx` 文件（非目录）也不被发现（文件只认 `.ts`/`.js`，实测）
- **判据**：`opencode2 plugin list` 列出候选（目录型只看 `tui` 入口存在与否）；真实加载看 `opencode2 api --standalone --print-logs GET /api/plugin` 的 stderr `msg="loading plugin"` + `WARN failed to load plugin ... cause`；TUI 侧看探针文件 `~/.local/share/opencode/log/tui-usage.log`（`$env:TUI_USAGE_PROBE=1`）
- **注意**：`plugin list` 读后台 **service 缓存**，改磁盘后需 `opencode2 service restart`（或等 `plugin update`）才刷新；`api --standalone` 起私有子服务可即时看真值
- **历史（≤18707，2026-09-01 三层根因，已过时仅供参考）**：18721/18743 曾出现「发现器只认根层 direct `.ts`/`.js` + 依赖外置化（server 端 import `@opencode-ai/plugin` 走磁盘 `~/.config/opencode/node_modules/`，官方从不安装）+ 加载器 `?mtime=` file:// URL bug」；我方实证提交 #46408、#42051 同族
- **配置安装（`opencode.json(c)` 的 `plugins`）与 TUI 加载的坑（2026-09-24，opencode `2.0.15` 实测；开发新插件时必读）**：
  1. **纯 TUI-only 包不会被加载**：包只暴露 `exports["./tui"]` 时，在 `plugins` 里配置它 → server 端因无 server 入口而**跳过**该包 → CLI 拿不到它 → `./tui` 永不加载，且**无明显报错**（`plugin list`/`/api/plugin` 也看不到）。**必须同时暴露 no-op `exports["./server"]`**（server 入口**不得触碰 `context.ui`**）才生效。发现式（`.opencode/plugins/<dir>/tui.tsx`）不受此影响，一直可用
  2. **`plugin list` / `GET /api/plugin` 不枚举「配置里的插件」**：用合法本地控制组 `./extra` 验证过——配置项正确也不出现在列表里；故「没列出」是**无效信号**，不能据此判加载失败
  3. **探针方法学（否则易得假阴性/假阳性）**：无头 `Start-Process opencode.exe --standalone -WindowStyle Hidden` **不可靠**（可能根本没跑到插件初始化）——必须重定向 stdout 确认渲染出主界面，否则阴性结论无意义；同名 spec（含 ref）的 git 安装会命中 `~/.cache/opencode/npm/git-*` **旧副本**，代码改了也不重拉，需清缓存或换 ref；把全局插件改名成 `plugins/opencode-tui-usage.bak` **仍会被发现器当插件加载**（伪造出成功日志），必须移出 `plugins/` 目录才是干净实验
  4. **配置键**：`"plugin"`（单数，V1）会被迁移为 `"plugins"`，两种皆可；`tui.json(c)` 的 `plugin` 字段在 `2.0.15` 上**未生效**（疑似更高版本才支持），CLI 侧插件来源实际仍以**发现式**为准
  5. **判据以实测为准**：`sst/opencode` 的 `dev` 分支源码可能领先于已发布版本（本次推理与 `2.0.15` 实测不符），两者冲突时以本机实测为准；验证配置安装的可靠判据 = 清缓存 + 全局插件移出 + 临时 git 工程 + 探针日志 `~/.local/share/opencode/log/tui-usage.log`

# 关键逻辑
- `sidebar.content` 的 `render({sessionID})` 仅跟当前展示会话，空会话 `providerID` 返回 `undefined` 不查额度、有缓存 `Map<providerID,QuotaData>` 切回瞬时显示，子代理独立 `sessionID` 不进侧边栏不触发
- 额度按 `providerID` 分桶：`model/quota.ts` 的 `QuotaStore`（cache/at/inFlight + **subscribe 写库通知**，依赖注入可测；`load(pid, {force})` 供轮询绕过 60s 限流，Sidebar 订阅的是当前组件实例，跨 render 重建不丢刷新）；供应商**运行时自动发现**（opencode 源码确认：TUI 插件为 bun 运行时逐文件动态 import，无打包器/glob）：`quota/index.ts` 顶层 await 用 fs 扫描 + 动态 import 收集 `quota/providers/<name>.ts` 导出 `provider` 的模块，交 `quota/registry.ts` 的 `createRegistry`（纯逻辑可测）推导白名单/URL/fetcher；白名单守卫与 fetcher 分发均经 `isQuotaProvider`/`normID` 按「小写+只留 [a-z]」归一化匹配（用户写法 `opencode-go`/`opencodego`/`opencode_go` 均命中），配置/DB 查找保持原样 pid（同源天然命中）；API URL 经 `getProviderApiUrl` 归一化查找（未启用/未注册落 `QUOTA_API_URL` 兜底）。**新增供应商 = 只需新增 `providers/<name>.ts` 一个文件，热重载即生效**
- 新增供应商模板（照抄 `quota/providers/opencode-go.ts`）：文件导出 `provider: {id, apiUrl, enabled?, fetch}`——`id` 任意写法（白名单归一化匹配）；`apiUrl` 用 `QUOTA_API_URL` 或自定义端点；`fetch(apiUrl, key): Promise<QuotaData | undefined>` 返回扁平 `QuotaData = {rolling?, weekly?, monthly?}`（各窗口 `{status?, percent?}`，percent 0-100 整数），`key` 由调用方经 `resolveProviderKey(id)` 注入（**仅用于 Authorization 头，不落盘不上报**）；`enabled` 默认 true，`enabled: false` = 已实现待验不激活（跳过白名单，新供应商验证期间可用）
- 功能开关一览：`TUI_USAGE_PROBE=1` 探针文件日志（默认关，见「运行与验证」日志行）；`QUOTA_API_URL` 未注册供应商 API URL 兜底；供应商级 `enabled: false` 跳过白名单（新供应商待验期间用）
- Command Code 已启用（`quota/providers/command-code.ts`：`mapCommandCode` 纯函数 + `fetchCommandCode` 双 API，`enabled: true`）；测试 `tests/command-code.test.ts` 离线覆盖转换逻辑
- 凭据解析统一在 `quota/key.ts`：`resolveProviderKey(pid)` 顺序 keyCache → 项目配置（近→远，同目录 `.opencode/` 优先）→ 全局配置（XDG_CONFIG_HOME 优先）→ DB credential 表兜底；支持 V2 `providers.{id}.settings.apiKey` / V1 `provider.{id}.options.apiKey` 与 `{env:VAR}` 占位符，模块零日志（脱敏：key 不落盘、不上报）

# UI 硬约束（Solid 响应式）
- **组件函数体只执行一次**：禁止 `const q = props.xxx` 这类 props 快照 const——挂载后 props 更新不生效（历史 bug：QuotaSection/UsageSection/ColorBar 均踩过，额度不显示、压缩上下文后进度条不刷新皆源于此）
- 取值必须发生在 **JSX 表达式位置**（Solid 编译器包装为响应式 getter），或惰性函数（`const pct = () => quotaPct(props.quota?.rolling)`）在 JSX 内调用
- 组件文件头部已含此约束注释；新增展示组件时必须遵守
