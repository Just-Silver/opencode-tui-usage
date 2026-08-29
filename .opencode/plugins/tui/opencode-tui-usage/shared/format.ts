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

// 额度百分比：API 返回整数，直接显示（42%）
export function fmtPctInt(v: number | undefined): string {
  return v !== undefined ? `${Math.round(v)}%` : ""
}

// 从额度窗口取可展示百分比：仅 status="ok" 且 percent 为数字
export function quotaPct(w: QuotaWindow | undefined): number | undefined {
  return w?.status === "ok" && typeof w.percent === "number" ? w.percent : undefined
}