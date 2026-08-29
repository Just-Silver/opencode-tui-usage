// ─── UI 层：主题常量与颜色判定 ───

// 颜色阈值（上下文占用 / 配额占比）
export const PCT_WARN_THRESHOLD = 50 // ≥50% 变黄
export const PCT_ERROR_THRESHOLD = 85 // ≥85% 变红

// 配色
export const INPUT_COLOR = "#6bcf7f" // 绿
export const WARN_COLOR = "#ffd93d" // 黄
export const ERROR_COLOR = "#ff6b6b" // 红

// 区块标题与窗口标签
export const SECTION_CACHE_TITLE = "会话"
export const SECTION_QUOTA_TITLE = "额度"
export const QUOTA_LABELS = ["5h", "周", "月"] as const

// 主题的结构化子集（opencode ctx.theme）
export type ThemeLike = { text: { default: string; subdued: string } }

// 进度条颜色：<50% 绿 → ≥50% 黄 → ≥85% 红
export function pctColor(theme: ThemeLike, pct: number | undefined): string {
  if (pct === undefined) return theme.text.subdued
  if (pct >= PCT_ERROR_THRESHOLD) return ERROR_COLOR
  if (pct >= PCT_WARN_THRESHOLD) return WARN_COLOR
  return INPUT_COLOR
}