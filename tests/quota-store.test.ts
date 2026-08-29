// ─── model/quota.ts QuotaStore 单元测试（mock deps，零网络） ───
import { test } from "node:test"
import assert from "node:assert/strict"
import { QuotaStore, type QuotaDeps } from "../.opencode/plugins/tui/opencode-tui-usage/model/quota.ts"
import type { QuotaData } from "../.opencode/plugins/tui/opencode-tui-usage/model/types.ts"

const okData: QuotaData = { rolling: { status: "ok", percent: 42 } }

function makeDeps(overrides: Partial<QuotaDeps> = {}): QuotaDeps & {
  fetchCalls: Array<{ pid: string; apiUrl: string; key: string }>
  logs: Array<{ level: "warn" | "error"; message: string }>
} {
  const fetchCalls: Array<{ pid: string; apiUrl: string; key: string }> = []
  const logs: Array<{ level: "warn" | "error"; message: string }> = []
  return {
    apiUrlFor: (pid) => `https://example.test/${pid}/usage`,
    resolveKey: async () => "k-test",
    fetch: async (pid, apiUrl, key) => {
      fetchCalls.push({ pid, apiUrl, key })
      return okData
    },
    log: (level, message) => logs.push({ level, message }),
    ...overrides,
    fetchCalls,
    logs,
  }
}

test("load 成功：写缓存、返回 true、参数透传", async () => {
  const deps = makeDeps()
  const store = new QuotaStore(deps)
  assert.equal(await store.load("opencode-go"), true)
  assert.deepEqual(store.get("opencode-go"), okData)
  assert.deepEqual(deps.fetchCalls, [{ pid: "opencode-go", apiUrl: "https://example.test/opencode-go/usage", key: "k-test" }])
  assert.equal(deps.logs.length, 0)
})

test("load missing key：记 warn、不写缓存、返回 false", async () => {
  const deps = makeDeps({ resolveKey: async () => undefined })
  const store = new QuotaStore(deps)
  assert.equal(await store.load("opencode-go"), false)
  assert.equal(store.get("opencode-go"), undefined)
  assert.equal(deps.fetchCalls.length, 0)
  assert.deepEqual(deps.logs, [{ level: "warn", message: "quota opencode-go missing key" }])
})

test("load empty response：记 warn、不写缓存", async () => {
  const deps = makeDeps({ fetch: async () => undefined })
  const store = new QuotaStore(deps)
  assert.equal(await store.load("opencode-go"), false)
  assert.equal(store.get("opencode-go"), undefined)
  assert.deepEqual(deps.logs, [{ level: "warn", message: "quota opencode-go empty response" }])
})

test("load fetch 失败：记 error、不写缓存", async () => {
  const deps = makeDeps({ fetch: async () => { throw new Error("boom") } })
  const store = new QuotaStore(deps)
  assert.equal(await store.load("opencode-go"), false)
  assert.equal(store.get("opencode-go"), undefined)
  assert.equal(deps.logs.length, 1)
  assert.equal(deps.logs[0].level, "error")
  assert.match(deps.logs[0].message, /^quota opencode-go fetch failed: Error: boom$/)
})

test("60s 限流：限流窗口内重复 load 不再发请求", async () => {
  const deps = makeDeps()
  const store = new QuotaStore(deps)
  assert.equal(await store.load("opencode-go"), true)
  assert.equal(await store.load("opencode-go"), false) // 限流
  assert.equal(await store.load("opencode-go"), false)
  assert.equal(deps.fetchCalls.length, 1)
})

test("并发去重：同一 pid 并发 load 只发一次请求", async () => {
  const deps = makeDeps()
  const store = new QuotaStore(deps)
  const [r1, r2] = await Promise.all([store.load("opencode-go"), store.load("opencode-go")])
  assert.equal(r1, true)
  assert.equal(r2, false)
  assert.equal(deps.fetchCalls.length, 1)
  // inFlight 清理后再次加载（绕过限流需换 pid 或模拟时间——直接验证不同 pid 独立）
  await store.load("other-go")
  assert.equal(deps.fetchCalls.length, 2)
})

test("不同 pid 独立分桶", async () => {
  const deps = makeDeps()
  const store = new QuotaStore(deps)
  await store.load("a-go")
  await store.load("b-go")
  assert.equal(deps.fetchCalls.length, 2)
  assert.deepEqual(store.get("a-go"), okData)
  assert.deepEqual(store.get("b-go"), okData)
})