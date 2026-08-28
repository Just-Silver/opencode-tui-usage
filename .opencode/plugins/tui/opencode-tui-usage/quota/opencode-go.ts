import type { QuotaData } from "./types"

const QUOTA_USER_AGENT = "opencode-tui-usage"

export async function fetchOpencodeGo(apiUrl: string, key: string): Promise<QuotaData | undefined> {
  const res = await fetch(apiUrl, {
    headers: { Authorization: `Bearer ${key}`, "User-Agent": QUOTA_USER_AGENT },
  })
  if (!res.ok) {
    console.warn(`quota opencode-go fetch failed: ${res.status} ${res.statusText}`)
    return
  }
  let json: { usage?: QuotaData }
  try {
    json = (await res.json()) as { usage?: QuotaData }
  } catch (e) {
    console.warn(`quota opencode-go json parse failed: ${String(e)}`)
    return
  }
  return json.usage
}
