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

## 隱私權政策（公開）

- 端點：`GET /legal/privacy-policy`（`auth: false`），方法 `useCandorApi().getPrivacyPolicy()`。
- 成功 `data`：`{ title, body, version, updated_at }`；`body` 為繁中 Markdown。
- Cookie 同意鍵：`candor.privacy.consent.version`（`PRIVACY_CONSENT_VERSION_KEY`）＝使用者已同意的 `data.version`；版本變更須重新提示。

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

- 路徑：`POST /conversation/{id}/messages/stream`（本 FE 回聲 follow-up 只走 stream；非 stream `POST …/messages` 同契約欄位，見 candor-core draft #134）。
- Body：`{ "content": "…", "intent": "…" }`（`intent` 與 `content` 同層；`buildStreamRequestBody`／`useCandorApi.streamMessage`）。`POST /profile/answers` 成功後的回聲 follow-up 帶 `intent: "after_answer"`（例：`{ "content": "無", "intent": "after_answer" }`），供 core 跳過問卷推斷；未知 intent core 白名單會忽略。使用者自行打字、`path_switch`、goals、報告上傳確認句不帶；判讀 CTA 仍用既有 `intent: "interpret"`。
- `claim_guard=blocked`：顯示安全提示原文，清空已串流 delta。
- 不得為 SSE 另建 BFF 代理（除非日後 core ADR 明確允許）。

## 下單與付款

- 建單帶建議回傳的 package 識別與 `composition_hash`（欄位以 OpenAPI 為準）。
- Sandbox：跟隨 `payment.redirect_url` 整頁導轉；callback 只打 core。
- **不得**實作或呼叫 `POST /payments/{provider}/callback`。

## 專家方案（spec 33 — core #143）

- 完成 CTA：usable `reply_actions.offer_recommend`（`mode=view_recommendations`）；首按 `POST /conversations/{id}/completion-choice` body `{}` → `recordCompletionChoice()`。
- 結帳預覽：`GET /checkout/preview?conversation_id&mode=ai|expert&package_plan_code?` → `getCheckoutPreview()`。
  - `mode=ai`：方案組成以回傳 `ai`（含 `items[]`＝`RecommendationPackageItem`）為準；**不得**再沿用 `POST /recommendations`。缺 `conversation_id`（用戶端）或 preview **422** `invalid_request` → 同一錯誤態（回對話）。切換 `package_plan_code` 重打 preview。
  - `mode=expert`：上架 `expert_plans`、`preselect_expert_plan_code`（僅一筆上架時）；關掉下架提示後的重新載入 `skipPreselect`（規則 31；使用者自行重整仍可依 core 單筆預選）。
  - `payment_methods[].status=coming_soon` → i18n `checkout.payment.coming_soon`；運費用 `shipping.fee`／`shipping.free`。
  - `block.code`：`expert_case_exists`／`no_expert_plans`；`checkout_locked`＋`checkout_lock_reason`。
  - **422** `questionnaire_incomplete`（core #145 `92e7bbc`；`mode=expert` preview 與 expert_plan 建單）：`error_data.missing_fields`＋`error_data.conversation_id` → 錯誤態（文案 `checkout.questionnaireIncomplete`）；「回到對話」優先用 `error_data.conversation_id`（否則 journey）；`missing_fields` **只存不顯示**（Irice 定案）；不接 `POST /order/{id}/expert-case/retry`。
  - **409** `conversation_already_ordered`（core #146；僅「對話已有已付款專家方案單」，含已付但建案失敗；`mode=expert` preview 與 expert_plan 建單）：`error_data` 容錯讀 `conversation_id`／`order_id`／`order_no`／`expert_case_id`（案件未建時可不帶）→ 錯誤態（`checkout.conversationAlreadyOrdered`）；有 `order_id` → CTA `/app/orders/{order_id}`（`checkout.conversationAlreadyOrderedCtaOrder`）；無 `order_id` 才回對話（優先 `error_data.conversation_id`，否則 journey；`checkout.conversationAlreadyOrderedCtaChat`）。
  - **未付款／pending／failed／expired 舊單**（core #146；Irice 06:00）：`mode=expert` preview **200** 帶 `existing_order: { order_id, order_no, expert_plan_code?, payment_status? } | null`（無則 `null`；`mode=ai` 固定 `null`）。有 `order_id` → 結帳 gate（`checkout.existingOrderRepay`）CTA 導 `/app/orders/{order_id}` 用訂單頁「重新付款」（`canRepayOrder` 含 `pending`）；缺 `order_id` 但有 `expert_plan_code` → 留在結帳並鎖定方案。同單 `POST /orders` → **201** 一般付款導轉亦可。`expert_plan_reuse_mismatch` **已退役**（legacy 409 若仍出現則 fallback 同 repay gate）。`conversation_case_exists`／retry **先不做**。
  - **409** `conversation_order_closed`（Irice 06:27；對話訂單已取消／退款，不可再開新單）：`error_data` 容錯讀 `conversation_id`／`order_id`／`order_no`／`reason` → 錯誤態（`checkout.conversationOrderClosed`）；CTA「開新對話」（`checkout.conversationOrderClosedCta`）→ `journey.clearSession()`＋導 `/chat`（同 `ChatPanel.resetConversation` 核心，無 confirm）。
- 建單：按「確認付款」才 `POST /orders`（expert：`kind=expert_plan`＋`expert_plan_code`）；不下草稿。下架 → `422` `expert_plan_inactive`。
- 定稿只讀：畫面在 `/app/expert-cases/{conversation_id}`；`GET /conversation/{id}/expert-review` → `getExpertReview()`，有 `order_id` 時另 `GET /order/{id}/finalized-plan` → `getFinalizedPlan()`。入口僅兩處：健康頁 reviewed 列「查看推薦方案」、訂單詳情「查看定稿方案」（皆帶該案 `conversation_id`）；**無**健康頁頁首單獨 CTA。
- 退款申請：`POST /order/{id}/refund-request` → `createRefundRequest()`；閘門以 `refund_blocked_reason` 為準（`not_yet_reviewed`／`picking_started`／`already_shipped`／`refund_rejected`／`refund_request_exists`）；專家單開始理貨前（shipment null）且定稿後才可申請。

## 通知 inbox（member）

- `GET /notifications` → `listNotifications()`；`data.notifications[]`（`id`、`type`／`event`、`title`、`body`、`created_at`、`read_at`、`deep_link`）。
- `GET /notifications/unread-count` → `getNotificationsUnreadCount()`；`data.unread_count`（FE badge 封頂 99+）。
- `POST /notifications/{id}/read` → `markNotificationRead(id)`；點列才呼叫，進列表不自動已讀。
- Guest／非 member：`403` `member_required`；頁面走 AuthGate，不把 inbox 當 guest API。

## OpenAPI 消費

現階段手寫 composables 對齊 [openapi-public.yaml](https://github.com/DaydreamLab/candor-core/blob/main/docs/api/openapi-public.yaml)。變更 API 時：core 文件優先 → 再改本 client。Codegen 列 roadmap Backlog。

## 相關

- 畫面：[10-screens.md](10-screens.md)
- 架構：[../01-architecture.md](../01-architecture.md)
- 進度：[../03-progress.md](../03-progress.md)
