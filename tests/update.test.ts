// ─── update/ 更新检测单元测试（离线，零网络） ───
import { test } from "node:test"
import assert from "node:assert/strict"
import {
  compareVersions,
  parseVersion,
} from "../.opencode/plugins/tui/opencode-tui-usage/update/version.ts"
import {
  resolveUpdate,
  fetchLatestRelease,
} from "../.opencode/plugins/tui/opencode-tui-usage/update/index.ts"

// ─── version.ts ───
test("parseVersion：SemVer 与 v 前缀", () => {
  assert.deepEqual(parseVersion("1.0.0"), { major: 1, minor: 0, patch: 0 })
  assert.deepEqual(parseVersion("v1.2.3"), { major: 1, minor: 2, patch: 3 })
  assert.equal(parseVersion("1.0"), undefined)
  assert.equal(parseVersion("v1.2.3.4"), undefined)
  assert.equal(parseVersion("abc"), undefined)
})

test("compareVersions：SemVer 比较", () => {
  assert.equal(compareVersions("1.0.0", "1.0.0"), 0)
  assert.equal(compareVersions("1.0.0", "1.0.1"), -1)
  assert.equal(compareVersions("1.0.1", "1.0.0"), 1)
  assert.equal(compareVersions("1.1.0", "1.0.9"), 1)
  assert.equal(compareVersions("2.0.0", "1.9.9"), 1)
  assert.equal(compareVersions("1.0.0", "v1.0.1"), -1) // 容忍 v 前缀
  assert.equal(compareVersions("abc", "1.0.0"), undefined) // 非法 → undefined
})

// ─── index.ts resolveUpdate ───
test("resolveUpdate：无远程 Release → 不提示", () => {
  assert.equal(resolveUpdate("1.0.0", undefined), undefined)
})

test("resolveUpdate：版本一致 → 不提示", () => {
  assert.equal(resolveUpdate("1.0.0", "v1.0.0"), undefined)
})

test("resolveUpdate：本地落后 → 提示，v 前缀剥离", () => {
  const u = resolveUpdate("1.0.0", "v1.1.0", "v1.1.0")
  assert.deepEqual(u, { latestVersion: "1.1.0", name: "v1.1.0", body: undefined })
})

test("resolveUpdate：本地超前（开发版）→ 不提示", () => {
  assert.equal(resolveUpdate("1.2.0", "v1.1.0"), undefined)
})

test("resolveUpdate：远程非法版本 → 不提示", () => {
  assert.equal(resolveUpdate("1.0.0", "latest"), undefined)
})

// ─── index.ts fetchLatestRelease（mock fetch） ───
test("fetchLatestRelease：200 返回 tag_name", async () => {
  const mock = (async () =>
    new Response(JSON.stringify({ tag_name: "v1.1.0", name: "v1.1.0", body: "changelog" }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    })) as unknown as typeof fetch
  const r = await fetchLatestRelease(mock)
  assert.equal(r?.tag_name, "v1.1.0")
})

test("fetchLatestRelease：404 / 失败 → undefined", async () => {
  const mock404 = (async () => new Response("not found", { status: 404 })) as unknown as typeof fetch
  assert.equal(await fetchLatestRelease(mock404), undefined)
  const mockThrow = (async () => {
    throw new Error("network")
  }) as unknown as typeof fetch
  assert.equal(await fetchLatestRelease(mockThrow), undefined)
})
