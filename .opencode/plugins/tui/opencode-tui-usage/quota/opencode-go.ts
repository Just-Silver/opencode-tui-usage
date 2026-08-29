import type { QuotaData } from "../model/types.ts"

const QUOTA_USER_AGENT = "opencode-tui-usage"

export async function fetchOpencodeGo(apiUrl: string, key: string): Promise<QuotaData | undefined> {
  const res = await fetch(apiUrl, {
    headers: { Authorization: `Bearer ${key}`, "User-Agent": QUOTA_USER_AGENT },
  })
  if (!res.ok) {
    throw new Error(`quota ${res.status} ${res.statusText}`)
  }
  let json: { usage?: QuotaData }
  try {
    json = (await res.json()) as { usage?: QuotaData }
  } catch (e) {
    throw new Error(`quota json parse failed: ${String(e)}`)
  }
  return json.usage
}
