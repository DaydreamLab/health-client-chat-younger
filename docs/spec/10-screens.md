# Spec 10 — 畫面與路由

規範本 app 路由與 middleware 對應的 core 呼叫。端點語意以 [candor-core spec 16](https://github.com/DaydreamLab/candor-core/blob/main/docs/spec/16-http-api.md)／[spec 31](https://github.com/DaydreamLab/candor-core/blob/main/docs/spec/31-client-integration.md) 為準。

i18n：`prefix_except_default`；下表路徑為預設語系（無 `/en` 前綴）。`/en/...` 行為相同。

## 路由一覽

| 路徑 | Layout／middleware | 主要能力 | Core 呼叫（摘要） |
|------|--------------------|----------|-------------------|
| `/` | default | 逛站、方案入口 | 可無 token；進旅程時 guest |
| `/login` | default | 登入／註冊 | `POST /auth/login`、`/auth/register` |
| `/chat` | `user` + `chat-layout` | 對話 SSE、目標／價格帶；上傳報告僅 member（guest 導向登入） | guest 可對話；`POST /health-reports` 需 member |
| `/app` | `user` + `auth` | 我的健康：profile 摘要卡＋報告列表（最新一筆展開判讀表）；guest 顯示登入門檻 | `GET /profile`；`GET /health-reports`；展開時 `GET /health-reports/{id}`（member） |
| `/app/wearables` | `user` + `auth` | 穿戴裝置即將上線佔位 | 無（殼） |
| `/app/recommendations` | `user` + `auth` | 建議與結帳 | `POST /recommendations`、`GET /package-plans`、`POST /orders`、`PATCH /users/me` |
| `/app/orders` | `user` + `auth` | 訂單列表 | `GET /orders` |
| `/app/orders/[id]` | `user` + `auth` | 訂單詳情、出貨時間線、對話 modal | `GET /order/{id}`；`GET /order/{id}/message`（已接） |
| `/app/me` | `user` + `auth` | 個人資料：顯示名稱、密碼、常用收件（email 唯讀）；guest 顯示登入門檻 | `GET`／`PATCH /users/me`（member） |
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
| Chat | `pages/chat.vue`、`components/ChatPanel.vue`、`components/TurnActions.vue` |

## 諮詢對話（`/chat`）

- 選項與確認在助理氣泡底部：確認鈕靠右。問卷或改善方向未完成前，不顯示方案名稱與「查看推薦方案」。
- 開場只問改善方向。選方向時，輸入框不提示「有沒有報告」。
- 選定兩個以上方向後，每個方向都問過並得到回答、且最新一則不再是問句之前，不視為問答完成，不貼「問答已完成」上傳引導。
- 氣泡內上傳鈕只出現在最新一則助理訊息，且該則是在問上傳或是否已有報告／檢驗。更早的訊息不補按鈕。輸入列的上傳入口仍在（guest 點了導向登入）。
| 建議／結帳 | `pages/app/recommendations.vue`、`composables/useFirstOrderApi.ts` |
| 個人資料 | `pages/app/me.vue`、側欄／`AccountUser` |
| 訂單 | `pages/app/orders/*`、`stores/orders.ts`、`components/ShipmentTimeline.vue`、`OrderChatModal.vue` |
| 報告表 | `components/ReportResultTable.vue`、`ReportDataDock.vue` |

## 相關

- API client：[11-api-client.md](11-api-client.md)
- 進度：[../03-progress.md](../03-progress.md)
