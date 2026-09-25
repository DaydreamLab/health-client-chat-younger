# 02 — Roadmap

里程碑以「可驗收結果」為準，非鎖定日曆。畫面／接線狀態與功能表見 [03-progress.md](03-progress.md)。

## M0 — 文件與 Repo

**範圍**

- AGENTS、docs/00–03、spec 10–11、README 索引
- 與 candor-core 04／05／31 交叉連結

**驗收**

- [x] 文件齊備並可在本 repo `main` 查閱

## M1 — Mock UI 與品牌骨架

**範圍**

- Nuxt 4 畫面、Design Token、i18n、登入牆與會員 layout
- FigJam 對齊的逛站／方案／chat 殼

**驗收**

- [x] GitHub Pages 靜態預覽可開
- [x] 首頁煙霧 e2e

## M2 — Auth、報告、對話直連

**範圍**

- guest／register／login／refresh／me
- 報告上傳、輪詢、retry
- conversation 建立／綁定／SSE；profile 問卷

**驗收**

- [x] Auth 主路徑 `已接`（去識別化除外）
- [x] 報告上傳／輪詢／retry `已接`
- [x] SSE 對話 `已接`（同步 messages 仍可 Mock）

## M3 — 建議、價格帶、訂單

**範圍**

- `POST /recommendations`、`GET /package-plans`
- 建單（`lines[]` + `composition_hash`）、列表、詳情、sandbox 導轉
- 常用收件 `PATCH /users/me`
- 重新付款、取消訂單的畫面入口（目前僅 client 方法）

**驗收**

- [x] 建議與建單列表詳情 `已接`（功能表：建議／價格帶／建單、訂單列表／詳情為 `可用`／`已接`）
- [ ] 重新付款、取消：畫面達 `可用`，接線達 `已接`（功能表對應列）

## M4 — 續約與收尾 API

**範圍**

- `GET /renewals/due`、續約對話 `renewal_of_order_id`
- 訂單反查對話、擁有者校正結果、`DELETE /users/me/data`

**驗收**

- [ ] 續約列表／續約對話：畫面達 `可用`（或明確無入口且標 `不做`），接線達 `已接` 或 `不做`
- [x] 訂單反查對話：接線 `已接`（`OrderChatModal` → `GET /order/{id}/message`）
- [ ] 擁有者校正、去識別化：畫面達 `可用`（或明確無入口且標 `不做`），接線達 `已接` 或 `不做`

## M5 — 拆 mock BFF 與舊識別子

**範圍**

- 移除／停用 `server/api/*` 對正式路徑的依賴
- 清掉 `plan`／`supplementPlan`／`basicCare`／`fullTune`／`supplementItem` 等識別子殘留

**驗收**

- [ ] codebase 搜尋無禁止識別子（中文文案除外）
- [ ] 正式旅程不依賴 Nitro mock

## Backlog

- OpenAPI codegen（orval／openapi-typescript）
- 同步 `POST .../messages`（若產品需要非 SSE；功能表列同步訊息）
- `GET /lab-services` 畫面接線（功能表列血檢主檔）

handoff 殼（`/app/handoff`）不進待做里程碑（功能表接線 `不做`）。

## 相關

- 進度勾選與功能表：[03-progress.md](03-progress.md)
- core M8：[candor-core docs/02](https://github.com/DaydreamLab/candor-core/blob/main/docs/02-roadmap.md)
