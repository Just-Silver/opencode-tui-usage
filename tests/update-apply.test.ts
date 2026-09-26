// ─── update/apply.ts 执行更新单元测试（离线，不真的跑安装脚本） ───
import { test } from "node:test"
import assert from "node:assert/strict"
import {
  applyUpdate,
  buildInstallCommands,
  summarizeOutput,
  INSTALL_PS1_URL,
  INSTALL_SH_URL,
  UPDATE_RUN_TIMEOUT_MS,
  type UpdateCommand,
  type UpdateExec,
  type UpdateRunResult,
} from "../.opencode/plugins/opencode-tui-usage/update/apply.ts"

// 可记录调用的假执行器：按序返回给定结果
function fakeExec(results: UpdateRunResult[]): { exec: UpdateExec; calls: { command: UpdateCommand; timeoutMs: number }[] } {
  const calls: { command: UpdateCommand; timeoutMs: number }[] = []
  let i = 0
  const exec: UpdateExec = async (command, timeoutMs) => {
    calls.push({ command, timeoutMs })
    const result = results[Math.min(i, results.length - 1)]
    i++
    return result
  }
  return { exec, calls }
}

const ok = (): UpdateRunResult => ({ code: 0, stdout: "", stderr: "" })

// ─── buildInstallCommands（平台判断） ───
test("buildInstallCommands：win32 优先 pwsh，回退 powershell", () => {
  const cmds = buildInstallCommands("win32")
  assert.equal(cmds.length, 2)
  assert.equal(cmds[0].file, "pwsh")
  assert.equal(cmds[1].file, "powershell")
  assert.deepEqual(cmds[0].args, cmds[1].args)
  assert.ok(cmds[0].args.includes(`irm ${INSTALL_PS1_URL} | iex`))
})

test("buildInstallCommands：非 win32 用 bash + curl install.sh", () => {
  for (const platform of ["darwin", "linux"]) {
    const cmds = buildInstallCommands(platform)
    assert.equal(cmds.length, 1)
    assert.equal(cmds[0].file, "bash")
    assert.deepEqual(cmds[0].args, ["-c", `curl -fsSL ${INSTALL_SH_URL} | bash`])
  }
})

// ─── summarizeOutput ───
test("summarizeOutput：优先 stderr，取末尾若干行", () => {
  const stderr = Array.from({ length: 20 }, (_, i) => `err${i + 1}`).join("\n")
  const out = summarizeOutput("stdout", stderr, 1, 3)
  assert.equal(out, "err18\nerr19\nerr20")
})

test("summarizeOutput：stderr 为空用 stdout；都空用退出码", () => {
  assert.equal(summarizeOutput("hello", "", 1), "hello")
  assert.equal(summarizeOutput("", "", 7), "命令退出码 7")
})

test("summarizeOutput：归一化 CRLF 并丢弃空行", () => {
  assert.equal(summarizeOutput("", "a\r\n\r\nb\r\n", 1), "a\nb")
})

// ─── applyUpdate 编排 ───
test("applyUpdate：单命令成功 → ok，且只调用一次", async () => {
  const { exec, calls } = fakeExec([ok()])
  const result = await applyUpdate({ platform: "linux", exec })
  assert.deepEqual(result, { ok: true })
  assert.equal(calls.length, 1)
  assert.equal(calls[0].command.file, "bash")
  assert.equal(calls[0].timeoutMs, UPDATE_RUN_TIMEOUT_MS)
})

test("applyUpdate：win32 pwsh 缺失（ENOENT）→ 回退 powershell 成功", async () => {
  const { exec, calls } = fakeExec([{ code: -1, stdout: "", stderr: "", spawnError: "ENOENT" }, ok()])
  const result = await applyUpdate({ platform: "win32", exec })
  assert.deepEqual(result, { ok: true })
  assert.equal(calls.length, 2)
  assert.equal(calls[0].command.file, "pwsh")
  assert.equal(calls[1].command.file, "powershell")
})

test("applyUpdate：非零退出 → 失败并带出输出尾部", async () => {
  const { exec } = fakeExec([{ code: 1, stdout: "", stderr: "boom\nfatal: not a git repository" }])
  const result = await applyUpdate({ platform: "linux", exec })
  assert.equal(result.ok, false)
  if (!result.ok) assert.ok(result.message.includes("fatal: not a git repository"))
})

test("applyUpdate：超时 → 失败并提示超时", async () => {
  const { exec } = fakeExec([{ code: -1, stdout: "", stderr: "", spawnError: "TIMEOUT" }])
  const result = await applyUpdate({ platform: "linux", exec, timeoutMs: 5_000 })
  assert.equal(result.ok, false)
  if (!result.ok) assert.ok(result.message.includes("超时"))
})

test("applyUpdate：所有候选命令都缺失 → 失败并说明", async () => {
  const { exec } = fakeExec([{ code: -1, stdout: "", stderr: "", spawnError: "ENOENT" }])
  const result = await applyUpdate({ platform: "win32", exec })
  assert.equal(result.ok, false)
  if (!result.ok) assert.ok(result.message.includes("未找到命令"))
})
