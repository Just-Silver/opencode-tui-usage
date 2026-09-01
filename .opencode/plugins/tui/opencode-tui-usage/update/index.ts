// ─── 更新模块：更新检查 ───
// 启动时查询 GitHub Releases API 最新版，与本地 VERSION 对比。
// 静默失败原则：网络失败 / 限流 / 无 Release / 本地超前 → 一律不打扰（返回 undefined）。
// GitHub 未认证 API 限流 60 次/小时，启动检查一次绰绰有余。
import { compareVersions, VERSION } from "./version.ts"

export const REPO = "Just-Silver/opencode-tui-usage"
export const RELEASES_LATEST_URL = `https://api.github.com/repos/${REPO}/releases/latest`

// 更新提示信息（纯数据）
export type UpdateInfo = {
  latestVersion: string // 远程最新 SemVer（去 v 前缀）
  name: string // Release 标题
  body?: string // Release 说明
}

// 纯逻辑（离线可测）：本地版本 vs 远程最新 → 是否需要提示
export function resolveUpdate(
  local: string,
  remote: string | undefined,
  name?: string,
  body?: string,
): UpdateInfo | undefined {
  if (!remote) return undefined // 无 Release → 不提示
  const cmp = compareVersions(local, remote)
  if (cmp === undefined || cmp >= 0) return undefined // 非法/本地不落后（含开发版超前）→ 不提示
  return { latestVersion: parseVersionTag(remote), name: name ?? `v${parseVersionTag(remote)}`, body }
}

// tag_name "v1.2.0" → "1.2.0"；非法原样返回（交给调用方）
function parseVersionTag(tag: string): string {
  return tag.replace(/^v/, "")
}

// 拉取远程最新 Release；任何失败 → undefined（静默）
export async function fetchLatestRelease(
  fetchImpl: typeof fetch = fetch,
): Promise<{ tag_name?: string; name?: string; body?: string } | undefined> {
  try {
    const res = await fetchImpl(RELEASES_LATEST_URL, {
      headers: { Accept: "application/vnd.github+json", "User-Agent": "opencode-tui-usage" },
    })
    if (!res.ok) return undefined // 404（无 release）/ 403（限流）/ 其他 → 静默
    const json = (await res.json()) as { tag_name?: string; name?: string; body?: string }
    return json
  } catch {
    return undefined // 网络异常 → 静默
  }
}

// 便捷入口：一次调用返回"是否有更新 + 提示信息"
export async function checkForUpdate(): Promise<UpdateInfo | undefined> {
  const remote = await fetchLatestRelease()
  if (!remote?.tag_name) return undefined
  return resolveUpdate(VERSION, remote.tag_name, remote.name, remote.body)
}

// 供测试直接导入
export { VERSION }
