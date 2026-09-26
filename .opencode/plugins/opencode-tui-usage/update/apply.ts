// ─── 更新模块：执行更新（复用官方安装脚本） ───
// 设计：
//   · 平台判断 → 选择安装命令（纯函数 buildInstallCommands，可离线单测）
//   · Windows：优先 pwsh（install.ps1 要求 PowerShell ≥7），命令不存在时回退 powershell
//   · macOS / Linux：bash + curl 执行 install.sh
//   · 通过 node:child_process 异步执行（不阻塞 TUI 线程），捕获 stdout/stderr，超时 120s
//   · 任一候选命令退出码 0 即成功；否则把输出尾部作为可读错误回报
//
// 与 update/index.ts 的"静默失败"原则不同：这里是用户主动点「更新」，
// 失败必须如实回报给弹窗（不能吞掉），否则用户不知道发生了什么。
import { execFile } from "child_process"

export const REPO_RAW_BASE = "https://raw.githubusercontent.com/Just-Silver/opencode-tui-usage/main"
export const INSTALL_PS1_URL = `${REPO_RAW_BASE}/install.ps1`
export const INSTALL_SH_URL = `${REPO_RAW_BASE}/install.sh`
export const UPDATE_RUN_TIMEOUT_MS = 120_000

export type UpdateCommand = { file: string; args: string[] }

// 纯函数：按平台给出候选安装命令（按顺序尝试；命令不存在 ENOENT 时换下一个）
export function buildInstallCommands(platform: string = process.platform): UpdateCommand[] {
  if (platform === "win32") {
    // install.ps1 顶部 #Requires -Version 7.0：优先 pwsh，5.1 的 powershell 仅作兜底
    const args = ["-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", `irm ${INSTALL_PS1_URL} | iex`]
    return [
      { file: "pwsh", args },
      { file: "powershell", args },
    ]
  }
  return [{ file: "bash", args: ["-c", `curl -fsSL ${INSTALL_SH_URL} | bash`] }]
}

// 纯函数：把命令输出裁成可读错误（优先 stderr，取末尾若干行）
export function summarizeOutput(stdout: string, stderr: string, code: number, maxLines = 12): string {
  const raw = (stderr.trim() || stdout.trim() || `命令退出码 ${code}`).replace(/\r\n/g, "\n")
  const lines = raw.split("\n").filter((line) => line.trim().length > 0)
  return lines.slice(-maxLines).join("\n")
}

export type UpdateRunResult = {
  code: number
  stdout: string
  stderr: string
  // 命令不存在 → "ENOENT"；超时 → "TIMEOUT"；正常退出/非零退出为 undefined
  spawnError?: "ENOENT" | "TIMEOUT"
}

export type UpdateExec = (command: UpdateCommand, timeoutMs: number) => Promise<UpdateRunResult>

export type UpdateResult = { ok: true } | { ok: false; message: string }

// 默认执行器：node:child_process 异步执行
export const execUpdateCommand: UpdateExec = (command, timeoutMs) =>
  new Promise((resolve) => {
    execFile(
      command.file,
      command.args,
      { timeout: timeoutMs, windowsHide: true, maxBuffer: 1_000_000 },
      (error, stdout, stderr) => {
        const out = String(stdout ?? "")
        const err = String(stderr ?? "")
        if (!error) return resolve({ code: 0, stdout: out, stderr: err })
        const raw = error as { code?: unknown; killed?: boolean }
        if (raw.killed) return resolve({ code: -1, stdout: out, stderr: err, spawnError: "TIMEOUT" })
        const code = typeof raw.code === "number" ? raw.code : 1
        const spawnError = raw.code === "ENOENT" ? "ENOENT" : undefined
        resolve({ code, stdout: out, stderr: err, spawnError })
      },
    )
  })

export type ApplyUpdateDeps = {
  platform?: string
  exec?: UpdateExec
  timeoutMs?: number
}

// 执行更新：按候选命令依次尝试；成功即返回，失败回报原因（注入 deps 便于离线单测）
export async function applyUpdate(deps: ApplyUpdateDeps = {}): Promise<UpdateResult> {
  const platform = deps.platform ?? process.platform
  const exec = deps.exec ?? execUpdateCommand
  const timeoutMs = deps.timeoutMs ?? UPDATE_RUN_TIMEOUT_MS

  let missing = ""
  for (const command of buildInstallCommands(platform)) {
    const result = await exec(command, timeoutMs)
    if (result.spawnError === "ENOENT") {
      missing = `未找到命令：${command.file}`
      continue
    }
    if (result.spawnError === "TIMEOUT") {
      return { ok: false, message: `更新超时（${Math.round(timeoutMs / 1000)}s）` }
    }
    if (result.code === 0) return { ok: true }
    return { ok: false, message: summarizeOutput(result.stdout, result.stderr, result.code) }
  }
  return {
    ok: false,
    message: missing || "未找到可用的安装命令（Windows 需要 pwsh 或 powershell；其他平台需要 bash）",
  }
}
