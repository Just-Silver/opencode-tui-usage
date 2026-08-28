export type QuotaWindow = { status?: string; percent?: number }
export type QuotaData = { rolling?: QuotaWindow; weekly?: QuotaWindow; monthly?: QuotaWindow }

export type QuotaProviderConfig = {
  apiUrl: string
  // 后续可扩展：headers、解析方式等
}
