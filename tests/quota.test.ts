// ─── quota/index.ts 白名单归一化与 fetcher 分发单元测试 ───
// 运行：node --test tests/quota.test.ts（与 key.test.ts 同目录一起跑亦可）
import { test } from "node:test"
import assert from "node:assert/strict"
import { fileURLToPath } from "node:url"
import { dirname, join } from "node:path"
import {
  fetchers,
  fetchQuota,
  getProviderApiUrl,
  isQuotaProvider,
} from "../.opencode/plugins/tui/opencode-tui-usage/quota/index.ts"
import { resolveApiKeyFromConfig } from "../.opencode/plugins/tui/opencode-tui-usage/quota/key.ts"

const fixtures = join(dirname(fileURLToPath(import.meta.url)), "fixtures")
const projectDir = join(fixtures, "project")

// ─── 白名单归一化（isQuotaProvider） ───
test("isQuotaProvider：任意写法命中 opencode-go", () => {
  for (const pid of ["opencode-go", "opencodego", "opencode_go", "Opencode-Go", "opencode2go"]) {
    assert.equal(isQuotaProvider(pid), true, `应为命中: ${pid}`)
  }
})

test("isQuotaProvider：无关/空 pid 不命中", () => {
  for (const pid of ["anthropic", "openai", "azure", "", "opencode-x"]) {
    assert.equal(isQuotaProvider(pid), false, `应不命中: ${pid}`)
  }
})

// ─── fetchQuota 归一化分发（用户写法 pid 也要能取到 fetcher） ───
test("fetchQuota：归一化匹配 fetcher 并透传 apiUrl/key", async () => {
  let seenApiUrl = ""
  let seenKey = ""
  fetchers["test-go"] = async (apiUrl: string, key: string) => {
    seenApiUrl = apiUrl
    seenKey = key
    return { rolling: { status: "ok", percent: 42 } }
  }
  const url = "https://example.test/v1/usage"
  for (const pid of ["test-go", "test_go", "Test-Go", "testgo"]) {
    const usage = await fetchQuota(pid, url, "k-secret")
    assert.equal(usage?.rolling?.percent, 42, `应为命中: ${pid}`)
    assert.equal(seenApiUrl, url)
    assert.equal(seenKey, "k-secret")
  }
})

test("fetchQuota：无对应 fetcher → undefined", async () => {
  assert.equal(await fetchQuota("nope", "https://x", "k"), undefined)
})

// ─── 全链路：用户写法的 pid → 守卫过 → 配置 key 命中 ───
test("全链路：opencodego 写法从配置提取 key（fixture 覆盖）", () => {
  // 会话 pid 为用户写法 opencodego：
  // 1) isQuotaProvider("opencodego") = true（白名单归一化）
  // 2) resolveApiKeyFromConfig("opencodego", {cwd: projectDir}) 命中配置里同名键
  assert.equal(isQuotaProvider("opencodego"), true)
  assert.equal(resolveApiKeyFromConfig("opencodego", { cwd: projectDir }), "sk-oc-go-alias-0000")
})

// ─── getProviderApiUrl（归一化 URL 查找；Command Code 未注册前全部落 QUOTA_API_URL） ───
test("getProviderApiUrl：opencode-go 任意写法命中专属 URL", () => {
  const url = getProviderApiUrl("opencode-go")
  assert.equal(url, "https://opencode.ai/zen/go/v1/usage")
  assert.equal(getProviderApiUrl("opencode_go"), url) // 归一化写法同样命中
})

test("getProviderApiUrl：未注册/无关 pid 落 QUOTA_API_URL 兜底", () => {
  assert.equal(getProviderApiUrl("command-code"), "https://opencode.ai/zen/go/v1/usage") // 注册注释期兜底
  assert.equal(getProviderApiUrl("nope"), "https://opencode.ai/zen/go/v1/usage")
})