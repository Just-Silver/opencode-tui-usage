# opencode-tui-usage：改为「配置安装」单一分发方式

- 日期：2026-09-24
- 分支：`feat/config-install`
- 状态：设计已确认，待实现

## 1. 背景与问题

现状分发依赖脚本：`install.sh` / `install.ps1` 通过 `curl | bash` 或 `irm | iex`，把插件目录复制到全局 `~/.config/opencode/plugins/opencode-tui-usage/`，再由 opencode 的目录发现器自动加载；`uninstall.sh` / `uninstall.ps1` 反向删除。

用户诉求：改为**在 `opencode.json(c)` 里配置一行即可安装**：

```jsonc
{ "plugins": ["Just-Silver/opencode-tui-usage"] }
```

且**成功实现后移除其它所有安装方式，只保留这一种**。

### 官方机制（已核实）

- 文档 `docs/plugins`（Configure / Manage / Reload）：`plugins` 数组支持 npm 名、版本、本地路径、`file://`，以及「npm 兼容的 Git 包规格」；**server 启动时会后台安装缺失的包**，并对未钉版本的 npm/Git 插件检查更新。
- 源码 `packages/opencode/src/plugin/shared.ts` 的 `resolvePluginTarget`：非路径规格 → `Npm.add(spec)`；`packages/core/src/npm.ts` 的 `Npm.add` 用 `@npmcli/arborist` 现装到 `global.cache/packages/…`。
- 因此「配置即安装」成立，无需 `install.sh`，也无需发布到 npm registry。

## 2. 目标

- 用户仅通过配置一行完成安装；更新与卸载有明确、文档化的操作。
- 删除 4 个安装/卸载脚本及全部相关文档。
- 仓库本身成为可从 GitHub 直接安装的合法 npm 包（根 `package.json`），**不发布 npm registry**。

## 3. 非目标

- 不改动插件内核（`model/`、`quota/`、`view/`、`shared/` 的行为与结构）。
- 不发布到 npm registry。
- 不为旧脚本用户提供自动化迁移（仅文档说明手工迁移）。

## 4. 设计

### 4.1 包清单（新增根 `package.json`）

```json
{
  "name": "opencode-tui-usage",
  "version": "2.0.0",
  "type": "module",
  "files": [".opencode/plugins/opencode-tui-usage"],
  "exports": { "./tui": "./.opencode/plugins/opencode-tui-usage/tui.tsx" },
  "dependencies": { "@opencode/plugin": "latest" },
  "peerDependencies": {
    "@opentui/core": ">=0.5.8",
    "@opentui/solid": ">=0.5.8",
    "solid-js": ">=1.9.0"
  }
}
```

字段来源与理由：

| 字段 | 来源/理由 |
|---|---|
| `name` | V2 源码 `resolvePluginId` 对 npm 源取 `package.json.name` 作为插件身份；须为 `opencode-tui-usage`，与插件 `id` 一致 |
| `exports["./tui"]` | V2 源码 `resolvePackageEntrypoint` 只认 `./tui`（TUI）；我们无 server 入口，故不写 `.` |
| `type` | 文档 "Publish and load" 示例（ESM） |
| `files` | 标准 npm 字段；兜住 `.opencode/` 点目录不被打包剔除（本方案独有风险） |
| `version` | 发版三方一致校验（tag == `update/version.ts` VERSION == 此值） |
| `dependencies` / `peerDependencies` | 照文档 "Publish and load" 示例；已核实 `@opencode/plugin@2.0.15`、`@opentui/core@0.5.12`、`@opentui/solid@0.5.12` 均存在于 npm registry |

> 破坏性分发变更，按 `update/version.ts` 的 SemVer 规则（major=破坏性）定 **2.0.0**。

### 4.2 仓库改动清单

| 动作 | 对象 |
|---|---|
| 新增 | `package.json` |
| 新增 | 离线单测：断言 `exports["./tui"]` 指向的文件存在、且被 `files` 覆盖 |
| 删除 | `install.sh`、`install.ps1`、`uninstall.sh`、`uninstall.ps1` |
| 改写 | `README.md`：安装/卸载/发布改为「配置一行 + `opencode plugin` 命令」，删除全部 curl/脚本说明 |
| 改写 | `AGENTS.md`：布局硬约束、发版、运行与验证三节中所有「install.sh 分发」描述 |
| 改写 | `.opencode/plugins/opencode-tui-usage/view/UpdateBanner.tsx`：文案 `重跑 install.sh` → `更新插件后重启` |
| 改写 | `.github/workflows/release.yml`：一致性校验扩展为 `package.json.version == update/version.ts VERSION == tag` |
| 重生成 | `CHANGELOG.md`（发版时由 git-cliff 生成，不手改） |

### 4.3 安装 / 更新 / 卸载 体验

```jsonc
// 安装（跟 main，自动检查更新）
{ "plugins": ["Just-Silver/opencode-tui-usage"] }

// 安装（钉 tag，可复现，推荐）
{ "plugins": ["github:Just-Silver/opencode-tui-usage#v2.0.0"] }
```

- 更新：`opencode plugin update opencode-tui-usage`（或重启 opencode）
- 卸载：`opencode plugin remove opencode-tui-usage`（或删配置行）
- 安装位置由 opencode 管理于 `global.cache/packages/…`，用户不再接触文件路径。

### 4.4 发版

保留现有 GitHub Release 流程（`v*` tag → Actions）。`#vX.Y.Z` 依赖 tag，更新检测依赖 Release，二者都必须保留。新增校验：`package.json.version`、`update/version.ts` 的 `VERSION`、tag 三者一致，不一致即 fail。

## 5. 验证方案与「成功」标准

### 5.1 前置探针（在删除旧脚本之前必须通过）

1. **本地路径快速验证入口解析**：临时项目写 `{"plugins":["file:///<repo-abs-path>"]}`，跑
   `opencode api --standalone --print-logs GET /api/plugin`。预期：解析到 `exports["./tui"]`；server 端因无 `./server` 判为 missing（非 error）。
2. **Git 规格真验证**：写 `{"plugins":["github:Just-Silver/opencode-tui-usage#<本次分支>"]}`，跑上述命令 + TUI 侧 `$env:TUI_USAGE_PROBE="1"`。预期：arborist 能 clone+安装；`.opencode` 点目录在安装产物内；CLI 侧加载 TUI；探针日志出现；侧边栏无崩溃；`bun:sqlite` 与 `quota/providers/` 扫描仍工作。
3. **卸载/更新验证**：`opencode plugin remove` 后不再加载；`opencode plugin update` 能识别并可更新。

### 5.2 成功标准

本机 opencode v2.0.15 上：写入配置行 → 自动安装 → 侧边栏额度正常显示、server 无崩溃、`opencode plugin update` 可拉到新版本。**全部通过后才删除旧脚本**；探针失败则停下重新设计，不删任何东西。

## 6. 风险与回退

| 风险 | 回退 |
|---|---|
| `.opencode/` 点目录被 `npm pack`/pacote 剔除，导致入口缺失 | 把插件目录改为非点目录（如 `plugin/`），或迁移到 `src/`；仅在探针确认后决定 |
| `@opencode/plugin` 依赖与运行时注入的模块冲突 | 去掉 `dependencies`，仅靠 opencode 运行时注入；作为探针验证项 |
| 未钉版本（裸 `owner/repo`）自动跟 main 带来意外更新 | 文档首要推荐钉 tag 写法；裸写法保留但标注会跟随更新 |
| 裸 `owner/repo` 写法官方文档未写明 | 文档以 `github:Just-Silver/opencode-tui-usage` 为准，裸写法作为等价简写注明；探针验证二者均可用 |

## 7. 旧用户迁移

已用脚本安装过的用户：删除 `~/.config/opencode/plugins/opencode-tui-usage/`，按新方式写入配置行，重启 opencode。README/CHANGELOG 说明一次即可，不写自动化脚本。

## 8. 待定问题

- 运行时解析的是 opencode 注入的 `@opencode/plugin/tui` 还是安装下来的 npm 副本？（探针 2 观察）
- `files` 能否稳定覆盖点目录（探针 2 观察）；若不能，采用第 6 节回退。
