// ─── 共享/帮助函数：展示格式化（纯函数，全层可引用） ───
import type { QuotaWindow } from "../model/types.ts"

// token 数：123.6k / 200k / 28.4k
export function fmtTokens(v: number): string {
  if (v >= 1_000_000) return trimZero((v / 1_000_000).toFixed(1)) + "M"
  if (v >= 1000) return trimZero((v / 1000).toFixed(1)) + "k"
  return String(v)
}

export function trimZero(s: string): string {
  return s.replace(/\.0$/, "")
}

// 百分比统一显示：1 位小数（如 34.8%）
export function fmtPct(v: number | undefined): string {
  return v !== undefined ? `${v.toFixed(1)}%` : ""
}

// 占总量占比（百分数，1 位小数）：v / total × 100
export function sharePct(v: number, total: number): string {
  return total > 0 ? fmtPct((v / total) * 100) : ""
}

// 额度百分比：原样透传（供应商决定精度）
// percent 契约：0-100 的有限数字（整数或任意小数）。整数显示 42%、小数原样显示 0.36%。
// UI 层零加工 → 新增供应商只需返回真实数值，显示层永远不用改。
export function fmtPctInt(v: number | undefined): string {
  if (v === undefined) return ""
  if (typeof v !== "number" || !Number.isFinite(v)) return "" // 防脏数据：非有限数字不显示
  return `${Math.max(0, Math.min(100, v))}%` // 越界 clamp，防脏数据
}

// 从额度窗口取可展示百分比：仅 status="ok" 且 percent 为数字
export function quotaPct(w: QuotaWindow | undefined): number | undefined {
  return w?.status === "ok" && typeof w.percent === "number" ? w.percent : undefined
}