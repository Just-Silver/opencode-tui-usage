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

// ── 视觉宽度（终端列数）：CJK/全角字符占 2 列，JS 字符串 length 会算错对齐 ──
export function charColumns(c: string): number {
  const code = c.codePointAt(0) ?? 0
  if (code < 0x20) return 0 // 控制字符
  if (code < 0x7f) return 1 // ASCII
  if (code < 0xa0) return 0 // C1 控制字符
  // 东亚宽字符 / 全角（CJK、假名、谚文、全角形式、emoji、SIP 汉字）
  if (
    (code >= 0x1100 && code <= 0x115f) ||
    (code >= 0x2e80 && code <= 0xa4cf) ||
    (code >= 0xac00 && code <= 0xd7a3) ||
    (code >= 0xf900 && code <= 0xfaff) ||
    (code >= 0xfe10 && code <= 0xfe6f) ||
    (code >= 0xff01 && code <= 0xff60) ||
    (code >= 0xffe0 && code <= 0xffe6) ||
    (code >= 0x1f300 && code <= 0x1f64f) ||
    (code >= 0x20000 && code <= 0x3fffd)
  )
    return 2
  return 1
}

export function visualWidth(s: string): number {
  let w = 0
  for (const c of s) w += charColumns(c)
  return w
}

// 满宽分隔线：1 行 "─" 铺满 width 个终端列。用于区块标题下方的独立分隔线。
export function dividerLine(width: number): string {
  return "─".repeat(Math.max(1, Math.floor(width)))
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