# Spec 10 — 畫面與路由

規範本 app 路由與 middleware 對應的 core 呼叫。端點語意以 [candor-core spec 16](https://github.com/DaydreamLab/candor-core/blob/main/docs/spec/16-http-api.md)／[spec 31](https://github.com/DaydreamLab/candor-core/blob/main/docs/spec/31-client-integration.md) 為準。

i18n：`prefix_except_default`；下表路徑為預設語系（無 `/en` 前綴）。`/en/...` 行為相同。

## 路由一覽

| 路徑 | Layout／middleware | 主要能力 | Core 呼叫（摘要） |
|------|--------------------|----------|-------------------|
| `/` | default | 逛站、方案入口 | 可無 token；進旅程時 guest |
| `/login` | default | 登入／註冊 | `POST /auth/login`、`/auth/register` |
| `/chat` | `user` + `chat-layout` | 上傳報告、對話 SSE、目標／價格帶 | guest；report／conversation／profile／stream |
| `/app` | `user` + `auth` | 會員首頁 | `ensureSession`（guest 亦可持有 token） |
| `/app/recommendations` | `user` + `auth` | 建議與結帳 | `POST /recommendations`、`GET /package-plans`、`POST /orders`、`PATCH /users/me` |
| `/app/orders` | `user` + `auth` | 訂單列表 | `GET /orders` |
| `/app/orders/[id]` | `user` + `auth` | 訂單詳情、出貨時間線、對話 modal | `GET /order/{id}`；`GET /order/{id}/message`（已接） |
| `/app/handoff` | `user` + `auth` | 舊 FigJam「交給顧問」殼 | 非 core 主路徑；勿新增假 API |

## Middleware 行為

| 檔案 | 行為 |
|------|------|
| `middleware/auth.ts` | client：`ensureSession()`；無 session 時不強制導向 `/login`（core 掛掉時留在頁面） |
| `middleware/chat-layout.ts` | 固定 `user` layout；client 確保 session |

`auth` **不**要求 `role=member`。建單等會員閘門由畫面／composable 處理（guest 結帳遮罩引導註冊）。

## 畫面模組對照

| UI | 主要檔案 |
|----|----------|
| Chat | `pages/chat.vue`、`components/ChatPanel.vue` |
| 建議／結帳 | `pages/app/recommendations.vue`、`composables/useFirstOrderApi.ts` |
| 訂單 | `pages/app/orders/*`、`stores/orders.ts`、`components/ShipmentTimeline.vue`、`OrderChatModal.vue` |
| 報告表 | `components/ReportResultTable.vue`、`ReportDataDock.vue` |

## 相關

- API client：[11-api-client.md](11-api-client.md)
- 進度：[../03-progress.md](../03-progress.md)
