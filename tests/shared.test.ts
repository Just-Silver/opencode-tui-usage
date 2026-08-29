// ─── shared/ 共享帮助函数单元测试 ───
import { test } from "node:test"
import assert from "node:assert/strict"
import { fmtPct, fmtPctInt, fmtTokens, quotaPct, sharePct, trimZero } from "../.opencode/plugins/tui/opencode-tui-usage/shared/format.ts"
import { normID } from "../.opencode/plugins/tui/opencode-tui-usage/shared/id.ts"
import { parseJson } from "../.opencode/plugins/tui/opencode-tui-usage/shared/jsonc.ts"

// ─── id：normID 归一化矩阵 ───
test("normID：小写 + 只留 [a-z]，任意写法归一", () => {
  assert.equal(normID("opencode-go"), "opencodego")
  assert.equal(normID("opencode_go"), "opencodego")
  assert.equal(normID("Opencode-Go"), "opencodego")
  assert.equal(normID("opencode2go"), "opencodego")
  assert.equal(normID("command-code"), "commandcode")
  assert.equal(normID("anthropic"), "anthropic")
  assert.equal(normID(""), "")
})

// ─── jsonc：parseJson ───
test("parseJson：纯 JSON / JSONC 注释尾逗号 / 无效文本", () => {
  assert.deepEqual(parseJson('{"a":1}'), { a: 1 })
  assert.deepEqual(
    parseJson(`{
  // 行注释
  "a": 1, /* 块注释 */
  "b": [1, 2,],
}`),
    { a: 1, b: [1, 2] },
  )
  assert.equal(parseJson("{oops"), undefined)
})

// ─── format ───
test("fmtTokens：千分/百万缩写", () => {
  assert.equal(fmtTokens(123), "123")
  assert.equal(fmtTokens(123600), "123.6k")
  assert.equal(fmtTokens(200000), "200k")
  assert.equal(fmtTokens(2840000), "2.8M")
  assert.equal(trimZero("200.0"), "200")
})

test("fmtPct / sharePct / fmtPctInt / quotaPct", () => {
  assert.equal(fmtPct(34.8), "34.8%")
  assert.equal(fmtPct(undefined), "")
  assert.equal(sharePct(50, 200), "25.0%")
  assert.equal(sharePct(50, 0), "")
  assert.equal(fmtPctInt(42.4), "42%")
  assert.equal(fmtPctInt(undefined), "")
  assert.equal(quotaPct({ status: "ok", percent: 42 }), 42)
  assert.equal(quotaPct({ status: "fail", percent: 42 }), undefined)
  assert.equal(quotaPct({ status: "ok" }), undefined)
  assert.equal(quotaPct(undefined), undefined)
})