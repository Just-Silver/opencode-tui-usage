# TODO

## 跟踪中

- [ ] **Windows 上「未钉版本的 git 插件」会让 opencode 弹命令窗**（opencode 侧问题，**非本插件**）
  - 现象：`plugins` 里写**未钉版本**的 git 源（如 `Just-Silver/opencode-tui-usage`），opencode 共享服务 cold start 做插件更新检查时 spawn `git ls-remote` **未加 `CREATE_NO_WINDOW`** → Windows 弹出可见控制台窗口。删 `~/.cache/opencode/npm/...` 后重启（触发强制重装）会弹更多次（实测 3 次）。
  - 根因/上游 issue：<https://github.com/anomalyco/opencode/issues/50868>（OPEN；`server: unpinned plugin update check flashes visible git console window on Windows`）
  - 同类已关闭：`#42440`、`#38715`、`#31629`、`#30315`（Windows 子进程 spawn 通用闪窗）
  - 规避：
    - **钉完整 40 位 commit SHA**（上游明确：full commit hash 会跳过 update check，完全不弹）；tag 是否同样跳过**未验证**。
    - 别删 `~/.cache/opencode/npm/...` 缓存（删了会触发重装 → 更多弹窗）。
    - 彻底不弹只能改用发现式安装（`~/.config/opencode/plugins/` 放目录）。
  - 动作：
    - [ ] 跟踪上游 #50868 修复
    - [ ] 视需要给 README 增加「怕弹窗请钉 commit SHA」的提示
    - [ ] 上游修复后回归验证
  - 备注：本插件自身**不 spawn 任何进程**（全仓无 `child_process`/`spawn(`/`exec(` 调用，唯一命中是 `quota/key.ts` 的正则 `.exec()`）。
