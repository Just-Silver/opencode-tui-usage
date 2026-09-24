# 配置安装插件（opencode `plugins`）

> 记录「通过 `opencode.json(c)` 的 `plugins` 让 opencode 自动安装插件」的方式与踩坑，供后续**新插件复用**。
>
> **适用范围：非 TUI 插件（server 侧）**。
> TUI 插件（渲染侧边栏等 Solid UI）**当前不要用配置安装**，原因见 [第 5 节](#5-tui-插件限制重要)。本仓库的 `opencode-tui-usage` 是 TUI 插件，因此面向用户只提供脚本安装（发现式）。
>
> 一切结论以本机实测为准；opencode 发布版源码可能领先/落后于实测。

## 1. 机制

在 `opencode.json(c)` 写：

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "plugins": ["<spec>"]
}
```

`<spec>`（配置里那串原文，即「目标」）可为：

- npm 包名：`name` 或 `@scope/name`；
- GitHub：`owner/repo` 或 `github:owner/repo`，可带 ref：`#v1.2.3`、`#<40 位 commit>`。

opencode 启动时经 arborist 把包（及其依赖）按需装到全局缓存 `~/.cache/opencode/npm/...`，再加载入口。

`"plugin"`（单数，V1 写法）会被自动迁移为 `"plugins"`，两者皆可。

## 2. 包必须满足的形状

- ESM：`"type": "module"`。
- `exports` 决定各入口（依据 `@opencode/plugin` 的 `Host.resolve` 规则，2.0.x 实测）：

  | 入口 | 取值 |
  | --- | --- |
  | server | 优先 `exports["./server"]`，否则回退 `exports["."]`；都没有则按约定 `index.js` |
  | tui | `exports["./tui"]`；都没有则按约定 `tui.js` |
  | rpc（可选） | `exports["./rpc"]` |

- **纯 TUI-only 包不会被加载**：只暴露 `exports["./tui"]` 时，server 侧 resolve 出 `server: undefined` → **整包被 server 跳过** → CLI 拿不到它 → `./tui` 永不加载，且**无明显报错**（`plugin list` / `/api/plugin` 也看不到）。因此即使只有 TUI 逻辑，也要给一个 no-op server 入口：

  ```json
  {
    "name": "opencode-acme-plugin",
    "type": "module",
    "exports": {
      "./server": "./src/server.ts",
      "./tui": "./src/tui.tsx"
    },
    "files": ["src"]
  }
  ```

  **server 入口不得触碰 `context.ui`**（server 侧没有 UI，触碰会崩）。

- `files` 必须覆盖 `exports` 指向的文件（防点目录/入口被剔除）。
- TUI 插件还需声明 OpenTUI/Solid 为 peerDependencies（见官方 publish 文档）。

## 3. 版本、更新与卸载

- 钉版本（可复现，推荐）：`github:owner/repo#v1.2.3`；未钉则跟随默认分支。
- 更新：`opencode plugin update <目标>`；卸载：`opencode plugin remove <目标>`。
  **`<目标>` 是配置里那串 spec 原样**（如 `owner/repo` 或 `github:owner/repo#v1.2.3`），非包名、非路径（依 `plugin update --help` 的 "configured package target"）。
- ⚠️ Windows：未钉版本的 git 源在冷启动做更新检查时会 spawn `git ls-remote` 且未加 `CREATE_NO_WINDOW` → **弹可见控制台窗口**（上游问题，非插件自身）。规避：钉完整 40 位 commit SHA（会跳过更新检查），或改用发现式安装。

## 4. 验证（避免假阴性/假阳性）

- `opencode plugin list` / `GET /api/plugin` **不枚举「配置里的插件」**：用合法本地控制组验证过，配置项正确也不出现在列表里 →「没列出」是**无效信号**，不能据此判定加载失败。
- 真实加载看 stderr：`opencode api --standalone --print-logs GET /api/plugin` 的 `msg="loading plugin"` 与 `WARN failed to load plugin ... cause`。
- 同名 spec（含 ref）的 git 安装会命中 `~/.cache/opencode/npm/git-*` **旧副本**，代码改了也不重拉 → 需清缓存或换 ref。
- `tui.json(c)` 的 `plugin` 字段在 `2.0.15` 上**未生效**（疑似更高版本才支持）；CLI 侧插件来源实际仍以发现式为准。

## 5. TUI 插件限制（重要）

- **根因**：配置安装会把插件装进 `node_modules`，而 npm v7+ 会**自动安装其 peerDependencies**（`solid-js`、`@opentui/*`）为插件**自己的副本**。opencode/OpenTUI 的运行时模块桥接对 `node_modules` 下的 tsx 不生效 → 插件跑在**独立的 Solid 响应式图**上，宿主 store 的更新无法通知到插件的 memo。
- **症状**：插件能画出首帧，但**后续更新永远不刷新**——例如侧边栏首次打开为空，**切换一次会话/标签页才显示**（切换会重挂组件、把 memo 重算一次）。
- **上游 issue**：
  - #48883 `tui: npm package TUI plugins render once and never update (dual solid-js runtime from node_modules resolution)`（已关闭为重复）
  - #33884 `TUI plugins referenced by npm package spec silently fail to load`（OPEN）
  - #39986 `tui: support reactive external TSX plugins in packaged CLI`（OPEN）
- **规避**：TUI 插件改用**发现式**安装——把插件目录放到 `~/.config/opencode/plugins/<name>/`（`node_modules` 之外），桥接生效、响应式正常。本仓库的脚本安装即此方式。
- server 侧（非 TUI）插件不碰 OpenTUI/Solid 渲染器，配置安装完全正常。

## 6. 本仓库现状

- `opencode-tui-usage` 是 TUI 插件，已**回退到脚本安装（发现式）**：根 `package.json`、no-op `server.ts` 及相关守护测试（`tests/package.test.ts`）已一并移除；面向用户的 README **只提供脚本安装**。
- 配置安装的完整知识保留在本文件；待 [第 5 节](#5-tui-插件限制重要) 的上游问题修复后，再按 [第 2 节](#2-包必须满足的形状) 的形状评估重新引入（本节 `package.json` 示例即所需形态）。
