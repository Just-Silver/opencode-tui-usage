# OpenDesign（open-design.ai）额度查询 API 探测报告

- 探测日期：2026-10-06
- 目标：判断能否为插件新增 `open-design` 供应商（对齐 `quota/providers/<name>.ts` 契约：一个 HTTP GET + `Authorization: Bearer <key>` → `QuotaData`）
- 前提：**用户只用 OpenCode + OpenDesign 的 API Key（不安装 OpenDesign 桌面 App）**，因此只能走公开 HTTP API
- 参考仓库：`https://github.com/nexu-io/open-design`（Apache-2.0，Electron + daemon + web monorepo）
- **最终结论：不提供面向外部 API Key 的额度查询 HTTP API。** 公开模型网关只有 `/v1/models` + chat；额度/用量数据在**控制台**（浏览器 Cookie 会话，`amr-api.open-design.ai/api/v1/...`），API Key 走不通。

## 1. 三个域名、两套凭据

云服务内部代号 **AMR / vela**（源码 `apps/daemon/src/integrations/vela.ts`、`runtimes/defs/amr.ts`）：

| 域名 | 用途 | 凭据 |
|---|---|---|
| `https://amr-link.open-design.ai` | **公开模型网关**（OpenAI/Anthropic 兼容），外部工具（OpenCode/Codex/Claude Code…）调用 | **API Key**（`sk-…`，控制台 `/cloud/api-keys` 创建） |
| `https://amr-api.open-design.ai/api` | **控制台后端**（Dashboard / 计费 / 用量 / API Key 管理） | **浏览器 Cookie 会话**（`credentials: "include"` + `x-vela-workspace-id`） |
| `https://amr-api.open-design.ai` | 桌面 App 控制面（另有 wallet/billing 路由） | `vela login` 的 **controlKey**（桌面 App 专用，用户不使用） |

`open-design.ai/cloud` 前端 bundle 内硬编码（`pricing-refund-policy-*.js`）：

```js
const VITE_PUBLIC_API_BASE_URL = "https://amr-api.open-design.ai/api"   // 控制台 API base
// Qx(hostname): open-design.ai → https://amr-link.open-design.ai      // 模型网关（给用户复制的 baseUrl）
// Wx(base,"openai") → base + "/v1"
```

即：**控制台 UI 的额度数据来自 `amr-api`（Cookie），而给外部工具复制的 baseUrl 是 `amr-link`（API Key）**，两者不是一回事。

## 2. 公开模型网关 `amr-link`（API Key）——无额度端点

方法/路径矩阵实测（404=`page not found` 路由不存在；401=存在需鉴权）：

- `GET /v1/models` → **401** `missing_api_key` / `invalid_api_key`（存在）
- `POST /v1/chat/completions`、`/v1/responses`、`/v1/messages` → **401** `invalid_api_key`（存在）
- 其余全部 **404**：`/v1/credits`、`/v1/usage`、`/v1/me`、`/v1/key`、`/v1/balance`、`/v1/wallet`、
  `/v1/billing/*`、`/v1/workspaces/*`、`/v1/runtime-api-keys`、`/v1/dashboard/*`、`/v1/organization/*`、
  `/api/v1/*`（nginx 404）、根路径 `/usage`、`/credits`、`/quota`、`/metrics`、`/status`、`/billing`…

> **API Key 无法通过任何 HTTP 端点查到额度/用量/余额。** 网关只认模型接口。

（旁证：`AstroQore/opendesign2api` 这个第三方 OpenAI 兼容代理也只实现 `/v1/models` + `/v1/chat/completions`，同样没有额度端点。）

## 3. 控制台 API `amr-api/api/v1`（Cookie 会话）——额度在这里

从前端 bundle 提取的完整端点（全部 `credentials: "include"`，无一发送 `Authorization`）：

```
GET  /api/v1/workspaces/{id}/billing/coding-plan-usage   ← 5h/7d Design Plan 用量窗口
GET  /api/v1/workspaces/{id}/wallet/balance              ← 工作区钱包余额
GET  /api/v1/workspaces/{id}/credits/me                  ← 我的 credits
GET  /api/v1/workspaces/{id}/dashboard
GET  /api/v1/workspaces/current
GET  /api/v1/billing/summary[?workspaceId=…]
GET  /api/v1/billing/ledger
GET  /api/v1/billing/subscription/offers
GET  /api/v1/billing/model-discounts
GET  /api/v1/wallet/recharges
GET  /api/v1/runtime-api-keys                            ← API Key 管理
GET  /api/v1/collab/events?codingPlanUsageEvents=1       ← SSE 实时用量变更
```

实测（无鉴权 / 任意假 Bearer 均同结果）：

| 路径 | 状态 |
|---|---|
| `/api/v1/workspaces/ws_x/billing/coding-plan-usage` | **401 `{"error":"unauthenticated"}`** |
| `/api/v1/workspaces/ws_x/wallet/balance` | 401 |
| `/api/v1/workspaces/ws_x/credits/me` | 401 |
| `/api/v1/billing/ledger` / `/wallet/recharges` / `/runtime-api-keys` / `/me` / `/workspaces/current` | 401 |
| `/api/v1/collab/events?codingPlanUsageEvents=1` | 401 `{"error":"untrusted_caller"}` |

响应头 `Access-Control-Allow-Credentials: true` + `Vary: Origin` → 设计给**浏览器 Cookie 跨域**，非 API Key。
**API Key 不是这些端点的凭据**（前端从不给它们带 `Authorization`；带假 Bearer 也只得到 `unauthenticated`）。

## 4. 官方文档怎么说

`open-design.ai/cloud/docs`（内容内嵌在 bundle，`en-US` + `zh-CN`）标题「One key for many models, billed by real tokens」：

- 卖点：`Unified model catalog` / **`Unified balance and billing records`** / `Unified request entry`
- 配置样例：`{ "provider": "amr", "baseUrl": "https://api.amr.dev/v1", "apiKey": "sk-...", "model": "gpt-4o-mini" }`

即「统一余额与计费记录」指的是**同一份余额/账单**（API 负载共享控制台的 credits），**不是**一个可供 API Key 查询余额的端点。
文档样例域名 `api.amr.dev` 公共 DNS **不解析**（`api.amr.dev` → NXDOMAIN；控制台实际经 `Qx()` 换算出 `amr-link.open-design.ai`）。

## 5. 对插件的最终判断

- 现有 provider 契约是「公开 HTTP GET + Bearer API Key」。OpenDesign 的公开网关**没有任何额度 GET 端点**，控制台端点又只认 Cookie（浏览器会话），**API Key 走不通**。
- 因此 **不建议**新增 `quota/providers/open-design.ts` —— 会是指向 401/404 的死路（等同 `enabled: false` 的未实现供应商）。
- 唯一能拿到额度的路径是 `amr-api` + 桌面 `vela login` 的 controlKey，但用户明确不安装桌面 App，排除。
- 结论：**OpenDesign 在「仅 OpenCode + API Key」的前提下无额度 API，插件按「无数据区块不渲染」处理即可**（与 deepseek 同）。

## 6. 如需复验（用户持有真实 API Key 时）

```powershell
$k = "<你的 OpenDesign API Key>"
# 1) 模型网关：预期 200
Invoke-WebRequest https://amr-link.open-design.ai/v1/models -Headers @{Authorization="Bearer $k"} -SkipHttpErrorCheck | % StatusCode
# 2) 控制台额度端点用 API Key 试（预期仍 401 unauthenticated）
foreach ($p in @("/api/v1/workspaces/current","/api/v1/billing/summary","/api/v1/workspaces/current/credits/me")) {
  try { $r = Invoke-WebRequest "https://amr-api.open-design.ai$p" -Headers @{Authorization="Bearer $k";Accept="application/json"} -SkipHttpErrorCheck; "$($r.StatusCode) $p $($r.Content)" } catch { "ERR $p" }
}
```

若 (2) 意外返回 200，则说明 API Key 可复用于控制台端点，可用 `coding-plan-usage` + `wallet/balance` 实现 provider（响应结构参见下文源码）。

## 7. 源码/端点定位

- `apps/daemon/src/integrations/vela.ts` — 域名、`controlKey`/`runtimeKey`、登录态
- `apps/daemon/src/integrations/vela-wallet.ts` — `/api/v1/wallet/balance`（controlKey）→ `{balanceUsd, updatedAt}`
- `apps/daemon/src/integrations/vela-billing.ts` — `vela billing summary/preflight` 解析：`balances{totalAvailableCredits,subscriptionCredits,rechargeCredits}`、`codingPlan.windows[]{usedCredits,remainingCredits,limitCredits,durationSeconds,resetMode,resetsAt}`
- `apps/daemon/src/runtimes/defs/amr.ts` — `VELA_RUNTIME_KEY` + `VELA_LINK_URL`（API Key 形态）
- 控制台 bundle：`https://open-design.ai/cloud/assets/cloud-root-*.js`（端点 + `VITE_PUBLIC_API_BASE_URL`）、`pricing-refund-policy-*.js`（API base 解析）
- 用量窗口语义（官方）：Go = 5h + 7d 两窗口；Plus/Pro/Max 仅 7d；plan-model credits 无窗口、按账单周期重置
