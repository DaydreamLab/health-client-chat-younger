# Spec 11 — API Client

規範 Browser 如何呼叫 candor-core。契約細節以 [candor-core spec 31](https://github.com/DaydreamLab/candor-core/blob/main/docs/spec/31-client-integration.md) 為準；本檔只固定本 repo 的實作落點。

## 實作落點

| 職責 | 檔案 |
|------|------|
| Base URL、`$fetch`、Bearer、SSE | `app/composables/useCandorApi.ts` |
| DTO、`CandorApiError`、`TOKEN_STORAGE_KEY` | `app/utils/candor-api.ts` |
| 建單／列表封裝 | `app/composables/useFirstOrderApi.ts` |
| Session | `app/stores/auth.ts` |

環境：`runtimeConfig.public.apiBase` ← `NUXT_PUBLIC_API_BASE`（預設 `http://localhost:8080/api/v1`）。

## Token

- Storage 鍵：`candor.guest.token`（常數 `TOKEN_STORAGE_KEY`）。
- guest 與 member 共用同一 user JWT 管道；註冊可原地升級同一 `user_id`。
- 只寫 `localStorage`；禁止 query／hash／log。
- `POST /auth/refresh` 在過期前換票；401 後停止重試風暴並清 session。

## 錯誤 envelope

成功：`{ "status": "success", "data": … }`。失敗：

```json
{
  "status": "failed",
  "error_message": "…",
  "error_code": "…",
  "error_data": null
}
```

依 `error_code`／HTTP 處理（見 spec 31）。常見：

| HTTP | 例 | Client 行為 |
|------|-----|-------------|
| 401 | 認證失敗 | 清 token 或導向登入 |
| 409 | `composition_changed` | 展示新組成，要求重新確認後再建單；不得沉默重送舊 hash |
| 409 | `already_member` | 註冊流程提示 |
| 422 | 驗證／`claim_blocked` | 標示欄位；ClaimGuard 命中不得改寫建議來源文案 |
| 429 | 限流 | 尊重 `Retry-After` |

`CandorApiError` 攜帶 `statusCode`、`error_code`、`error_data`。

## SSE

- 路徑：`POST /conversation/{id}/messages/stream`。
- `claim_guard=blocked`：顯示安全提示原文，清空已串流 delta。
- 不得為 SSE 另建 BFF 代理（除非日後 core ADR 明確允許）。

## 下單與付款

- 建單帶建議回傳的 package 識別與 `composition_hash`（欄位以 OpenAPI 為準）。
- Sandbox：跟隨 `payment.redirect_url` 整頁導轉；callback 只打 core。
- **不得**實作或呼叫 `POST /payments/{provider}/callback`。

## OpenAPI 消費

現階段手寫 composables 對齊 [openapi-public.yaml](https://github.com/DaydreamLab/candor-core/blob/main/docs/api/openapi-public.yaml)。變更 API 時：core 文件優先 → 再改本 client。Codegen 列 roadmap Backlog。

## 相關

- 畫面：[10-screens.md](10-screens.md)
- 架構：[../01-architecture.md](../01-architecture.md)
- 進度：[../03-progress.md](../03-progress.md)
