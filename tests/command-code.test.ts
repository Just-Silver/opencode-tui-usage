// ─── quota/command-code.ts mapCommandCode 单元测试（离线，零网络） ───
// 注意：Command Code 注册暂注释（等待真实订阅数据），此处只管纯转换函数；
// fetchCommandCode 的网络路径取消注册后可手动验证。
import { test } from "node:test"
import assert from "node:assert/strict"
import { mapCommandCode } from "../.opencode/plugins/tui/opencode-tui-usage/quota/command-code.ts"

// 构造有数据的正常响应
const creditsWithData = {
  credits: { monthlyCredits: 28 },
  windowLimits: {
    fiveHour: { used: 19, cap: 100 },
    weekly: { used: 21, cap: 100 },
  },
}
const subGoat = { success: true, data: { planId: "individual-goat", currentPeriodEnd: "2026-09-24T00:00:00Z" } }

test("正常数据：三窗口百分比正确（planId 命中映射 → 月度）", () => {
  // monthly: cap=70(goat), 已用=70-28=42 → 42/70=60%
  const q = mapCommandCode(creditsWithData, subGoat)
  assert.deepEqual(q, {
    rolling: { status: "ok", percent: 19 },
    weekly: { status: "ok", percent: 21 },
    monthly: { status: "ok", percent: 60 },
  })
})

test("窗口 used>cap：clamp 到 100", () => {
  const q = mapCommandCode(
    {
      credits: { monthlyCredits: 0 },
      windowLimits: { fiveHour: { used: 150, cap: 100 }, weekly: { used: 200, cap: 100 } },
    },
    subGoat,
  )
  assert.equal(q?.rolling?.percent, 100)
  assert.equal(q?.weekly?.percent, 100)
})

test("窗口字段缺失/为 null → 对应窗口 undefined", () => {
  const q = mapCommandCode(
    {
      credits: { monthlyCredits: 10 },
      windowLimits: { fiveHour: null, weekly: undefined, limited: false },
    },
    subGoat,
  )
  assert.equal(q?.rolling, undefined)
  assert.equal(q?.weekly, undefined)
  assert.equal(q?.monthly?.percent, 86) // 月窗口不受影响：(70-10)/70 ≈ 85.7 → 86
})

test("subscriptions data=null → monthly undefined，5h/周照常", () => {
  const q = mapCommandCode(creditsWithData, { success: true, data: null })
  assert.deepEqual(q?.monthly, undefined)
  assert.equal(q?.rolling?.percent, 19)
  assert.equal(q?.weekly?.percent, 21)
})

test("subscriptions 失败降级（undefined 传入）→ 5h/周照常", () => {
  const q = mapCommandCode(creditsWithData, undefined)
  assert.equal(q?.rolling?.percent, 19)
  assert.equal(q?.weekly?.percent, 21)
  assert.equal(q?.monthly, undefined)
})

test("planId 未知 → monthly undefined（映射未命中静默）", () => {
  const q = mapCommandCode(creditsWithData, { success: true, data: { planId: "individual-hype-tier" } })
  assert.equal(q?.monthly, undefined)
  assert.equal(q?.rolling?.percent, 19)
})

test("余额异常（>cap）→ monthly undefined", () => {
  const q = mapCommandCode(
    { credits: { monthlyCredits: 999 }, windowLimits: { fiveHour: { used: 1, cap: 100 } } },
    subGoat,
  )
  assert.equal(q?.monthly, undefined)
  assert.equal(q?.rolling?.percent, 1)
})

test("实测空账户真空用例：credits 全 0 + windowLimits 全 null + data null → 空 QuotaData", () => {
  const q = mapCommandCode(
    {
      credits: { belowThreshold: false, creditThreshold: 0, monthlyCredits: 0, purchasedCredits: 0, freeCredits: 0 },
      windowLimits: { limited: false, exceeded: null, fiveHour: null, weekly: null },
    },
    { success: true, data: null },
  )
  assert.equal(q, undefined)
})

test("完全空响应/undefined → undefined", () => {
  assert.equal(mapCommandCode(undefined, undefined), undefined)
  assert.equal(mapCommandCode({}, {}), undefined)
})