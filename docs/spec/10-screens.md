# Spec 10 — 畫面與路由

規範本 app 路由與 middleware 對應的 core 呼叫。端點語意以 [candor-core spec 16](https://github.com/DaydreamLab/candor-core/blob/main/docs/spec/16-http-api.md)／[spec 31](https://github.com/DaydreamLab/candor-core/blob/main/docs/spec/31-client-integration.md) 為準。

i18n：`prefix_except_default`；下表路徑為預設語系（無 `/en` 前綴）。`/en/...` 行為相同。

## 路由一覽

| 路徑 | Layout／middleware | 主要能力 | Core 呼叫（摘要） |
|------|--------------------|----------|-------------------|
| `/` | default | 逛站、方案入口 | 可無 token；進旅程時 guest |
| `/privacy` | default | 隱私權政策（Markdown）；首訪 Cookie 同意橫幅鍵結 `version` | `GET /legal/privacy-policy`（公開，無需 token） |
| `/about` | default | 關於坦見（靜態 placeholder Markdown；無 version meta） | 無（第一波不走 `legal_documents`） |
| `/terms` | default | 服務條款（靜態 placeholder Markdown；顯示更新日期 · 版本） | 無（第一波不走 `legal_documents`） |
| `/login` | default | 登入／註冊 | `POST /auth/login`、`/auth/register` |
| `/chat` | `user` + `chat-layout` | 對話 SSE、目標／價格帶；上傳報告僅 member（guest 導向登入）。推薦槽在尚未建案時為「提交專家判讀」 | guest 可對話；`POST /health-reports` 需 member；會員「提交專家判讀」為 `POST /conversation/{id}/expert-review` |
| `/chat-ai` | `user` + `chat-layout` | 與 `/chat` 共用對話。標準流程（畫面「標準」）推薦槽為「查看推薦方案」，進入 `/app/recommendations?flow=standard` | 同 `/chat` 對話；建議只打 `POST /recommendations` 後結帳，不呼叫 expert-review |
| `/app` | `user` + `auth` | 我的健康：profile 摘要卡＋報告列表（`GET /health-reports?limit=5&offset=` 分頁；`total > 5` 顯示上一頁／下一頁；**無**專家判讀記錄列、**無**頁首「查看推薦方案」CTA） | `GET /profile`；`GET /health-reports` |
| `/app/wearables` | `user` + `auth` | 穿戴裝置範例（假資料、`?demo=` 切狀態） | 無 API |
| `/app/wearables/:deviceId` | `user` + `auth` | 單一裝置趨勢（7／30 天） | 無 API |
| `/app/renewals` | `user` + `auth` | 待續約即將上線佔位（列表與續約對話暫不從這頁進入） | 無（殼）；client 仍保留 `GET /renewals/due`、`renewal_of_order_id` |
| `/app/recommendations` | `user` + `auth` | 只做「AI 方案／專家方案」二選；選 AI 後 `POST /recommendations` 載入方案再進結帳；選專家方案進 `?kind=expert_plan` 結帳。不查 expert-review、不定稿唯讀 | `POST /recommendations`（選 AI 時）；結帳另頁 |
| `/app/expert-cases/[id]` | `user` + `auth` | 專家案件定稿唯讀（`id`＝案件 conversation id）。付費案可連訂單 | `GET /conversation/{id}/expert-review`；有 `order_id` 時另 `GET /order/{id}/finalized-plan`、`GET /order/{id}` |
| `/app/checkout` | `user` + `auth` | AI／專家共用結帳（`?kind=package`｜`?kind=expert_plan`）；同頁預覽、按「確認付款」建單；專家卡顯示內含保健品方案名（有 `package_plan_name_*`／code 才顯示）；缺 `conversation_id` 時 AI 顯示諮詢紀錄錯誤＋回對話；`questionnaire_incomplete`／`conversation_already_ordered`／`existing_order` repay／`conversation_order_closed`（開新對話）gate | `GET /checkout/preview`（AI 品項用 `ai.items`）、`POST /orders`、`PATCH /users/me` |
| `/app/orders` | `user` + `auth` | 訂單列表 | `GET /orders` |
| `/app/orders/[id]` | `user` + `auth` | 訂單詳情、出貨時間線、對話 modal；專家方案可「申請退款」／顯示「退款申請中」；定稿後「查看定稿方案」導 `/app/expert-cases/{conversation_id}`（定稿方案的主要入口）；**預約專家**訂單顯示服務狀態、確認時間、選品與理由（不含服務紀錄） | `GET /order/{id}`（含假設欄位 `expert_booking`）；`GET /order/{id}/message`；`POST /order/{id}/refund-request` |
| `/app/orders/paid` | `user` + `auth` | 預約專家付款成功中繼頁（F-05） | 讀 query `id` → `GET /order/{id}` |
| `/app/orders/pay-failed` | `user` + `auth` | 預約專家付款失敗／取消中繼頁（F-06）；可重新付款 | `POST /order/{id}/payment` |
| `/expert-booking` | `user` + `auth` | 預約專家說明＋表單同頁（F-02／F-03）；名稱／說明／價格讀 `GET /expert-booking-product`；下架（404 `expert_booking_unavailable`）顯示「目前暫停預約」並停用送出；未登入會員顯示登入門檻（`?redirect=/expert-booking`） | `GET /expert-booking-product` |
| `/expert-booking/confirm` | `user` + `auth` | 確認預約資料 → 送出並前往付款（F-04）；POST 409 `expert_booking_unavailable` 同暫停提示 | `POST /orders`（`kind=expert_booking` + `expert_booking`；回 `OrderCreated`） |
| `/app/notifications` | `user` + `auth` | 通知中心列表（篩選全部／未讀、點列標已讀＋deep link）；guest 顯示 dashed AuthGate；空／錯誤態 | `GET /notifications`、`GET /notifications/unread-count`、`POST /notifications/{id}/read`（member；guest 403） |
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
| Chat | `pages/chat.vue`、`pages/chat-ai.vue`、`components/ChatPanel.vue`、`components/TurnActions.vue` |

## 諮詢對話（`/chat` 與 `/chat-ai`）

`/chat-ai`（導覽「AI 諮詢」，英文 `/en/chat-ai`）與 `/chat` 共用 `ChatPanel`。`flow=standard` 時推薦槽只顯示「查看推薦方案」，導向 `/app/recommendations?flow=standard`，建議頁只載入直接建議（`POST /recommendations`）與既有結帳，不建立專家案件、不輪詢判讀、通過後也不自動回對話。`/chat` 與我的健康判讀卡仍走專家判讀。

## 諮詢對話（`/chat`）

- Intake **三要件**（皆必問）：① 問卷 profile gaps ② **report**（`ask_report`，類 goal、**不進 gap**；gap 全滿後仍要問）③ goals。三要件未齊時不進入「完成 CTA」。
- 三要件齊後：基本回應 → **CTA 判讀**（systemone／catalog）→ **完成 CTA**；FE 依 usable `reply_actions` 決定畫哪些按鈕（含 upload／checkup／`offer_recommend`／`offer_full_test`／`offer_expert_booking` 等）——**非**固定硬掛「提交專家判讀」。intentional `none`／degraded／無 RA＝不畫怪鈕。**Legacy** `upload_offer`／journey 自創 recommend **不當 fallback**。
- `offer_full_test`：報告解析指標未達門檻時由 core 掛上；FE 投影建議文案＋外連鈕（`payload.url`，缺省 Body Decode；`target=_blank`＋`noopener`），排在同則其他 CTA 後面；文案／按鈕字優先 `payload.copy`／`label`，否則 i18n（`marker_count`／`n` 填 `{n}`）。出不出、同一報告只出一輪、20 題上限不出等由 core 控制；FE **不做**點擊追蹤。
- `offer_expert_booking`：goals 含「減重」或「腸胃道」時由 core 只出此 CTA（不出保健品方案 CTA）；FE 投影「預約專家諮詢」→ `/expert-booking`（`payload.path`／`label` 可覆寫）。FE **不**依 goals 自行合成。
- 選項與確認在助理氣泡底部：確認鈕靠右。仍在選改善方向、report 必問、或**本則**仍是 required profile 時，不畫完成 CTA 的 recommend 槽。每則助理泡泡只顯示**自己** `reply_actions` 的按鈕；**不**把舊訊息未答題搬到最新一則（舊訊息維持不顯示按鈕）。B／C 必填問完後 core 每輪可回完成 CTA——前台忠實投影、不自行合併／去重／隱藏。
- 開場只問改善方向。選方向時，輸入框不提示「有沒有報告」。
- 氣泡內上傳鈕只出現在最新一則且該則 usable `ask_report`（或 lab_followup→upload）。輸入列的上傳入口仍在（guest 點了導向登入）。
| 建議／結帳 | `pages/app/recommendations.vue`、`pages/app/checkout.vue`、`composables/useFirstOrderApi.ts` |
| 個人資料 | `pages/app/me.vue`、側欄／`AccountUser` |
| 訂單 | `pages/app/orders/*`、`stores/orders.ts`、`components/ShipmentTimeline.vue`、`OrderChatModal.vue` |
| 通知中心 | `pages/app/notifications.vue`、`stores/notifications.ts`、`components/notifications/*`、`utils/notifications*.ts`、`useCandorApi` inbox 方法；rail 未讀 badge 經 `useMemberNavExtension`＋`unread-count` |
| 報告表 | `components/ReportResultTable.vue`、`ReportDataDock.vue` |
| 隱私權／Cookie 同意 | `pages/privacy.vue`、`components/CookieConsentBanner.vue`、`utils/privacy-consent.ts`；footer「隱私權政策」→ `/privacy` |
| 關於／服務條款 | `pages/about.vue`、`pages/terms.vue`；footer「關於坦見」→ `/about`、「服務條款」→ `/terms`（靜態 placeholder） |

## Cookie 同意

- 首次進入（或隱私權政策 `version` 變更後）於全站顯示固定橫幅；同意後以 `localStorage` 鍵 `candor.privacy.consent.version`（`PRIVACY_CONSENT_VERSION_KEY`）寫入當次 `data.version`。
- 無類別／細項同意 UI；橫幅連到 `/privacy`。

## 相關

- API client：[11-api-client.md](11-api-client.md)
- 進度：[../03-progress.md](../03-progress.md)
