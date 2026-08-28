export type QuotaWindow = { status?: string; percent?: number }
export type QuotaData = { rolling?: QuotaWindow; weekly?: QuotaWindow; monthly?: QuotaWindow }
