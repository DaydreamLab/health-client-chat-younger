# 03 — 開發進度

對應 [02-roadmap.md](02-roadmap.md)。完成時改 `[ ]` → `[x]`；接線切片用狀態欄。

**同步規則**：本檔與 [candor-core docs/04-integration-progress.md](https://github.com/DaydreamLab/candor-core/blob/main/docs/04-integration-progress.md) 的 Younger 區必須一致。功能表的**接線**欄變更時，須與本檔下方 API 切片及 candor-core `04` 一起改；**畫面**欄只改本 repo。

## 狀態定義

### 接線

| 狀態 | 意涵 |
|------|------|
| `Mock` | 仍用前端假資料／本地 store，未打 core |
| `接線中` | 已開始改 `$fetch`／型別，尚未整段可驗收 |
| `已接` | 該切片對真 API 可走通，識別子為 core 詞 |
| `不做` | 明確不在範圍；不得改為其他狀態 |
| `不需` | 純前端、不打 core |

### 畫面

| 狀態 | 意涵 |
|------|------|
| `無` | 沒有路由／入口 |
| `殼` | 有頁但是示範資料、demo 徽章或只做導向 |
| `可用` | 正式旅程可操作 |

## M0 — 文件

- [x] AGENTS.md
- [x] docs/00–03、spec/10–11
- [x] README 文件索引

## M1 — Mock UI

- [x] Nuxt 4 + Nuxt UI + i18n + Pinia
- [x] 首頁／登入／chat／會員區殼
- [x] Pages 預覽與單元／煙霧測試骨架

## 功能（使用者可見）

接線欄由下方 API 切片彙總，不另立第二套接線真相。不把 FigJam 預約／採檢／三方案拉回現行主路徑。

| 功能 | 路由／入口 | 畫面 | 接線 | 里程碑 |
|------|------------|------|------|--------|
| 逛站首頁 | `/` | 可用 | 不需 | — |
| 登入／註冊／身份／常用收件 | `/login`、結帳收件 | 可用 | 已接 | — |
| 去識別化 | — | 無 | Mock | M4 |
| 報告上傳／輪詢／重試 | `/chat` | 可用 | 已接 | — |
| 擁有者校正結果 | — | 無 | Mock | M4 |
| Profile 問卷 | `/chat` | 可用 | 已接 | — |
| 對話（建立／綁定／目標／價格帶／SSE） | `/chat` | 可用 | 已接 | — |
| 同步訊息（非 SSE） | — | 無 | Mock | Backlog |
| 會員首頁 | `/app` | 殼（demo 徽章） | 不需 | — |
| 建議／價格帶／建單 | `/app/recommendations` | 可用 | 已接 | — |
| 血檢主檔列表 | — | 無 | 接線中 | Backlog |
| 訂單列表／詳情／出貨時間線 | `/app/orders`、`/app/orders/[id]` | 可用 | 已接 | — |
| 訂單反查對話 | 訂單詳情 modal | 可用 | 接線中 | M4 |
| 重新付款 | — | 無 | Mock | M3 |
| 取消訂單 | — | 無 | Mock | M3 |
| 續約列表／續約對話 | — | 無 | Mock | M4 |
| 舊 handoff 殼 | `/app/handoff` | 殼（導向 `/chat`） | 不做 | — |

## 接線切片（對齊 core 04）

### Auth

| 能力 | 端點（`/api/v1`） | 狀態 |
|------|-------------------|------|
| 訪客簽發 | `POST /auth/guest` | 已接 |
| 註冊（含 guest 原地升級） | `POST /auth/register` | 已接 |
| 登入 | `POST /auth/login` | 已接 |
| 換票 | `POST /auth/refresh` | 已接 |
| 目前身份 | `GET /users/me` | 已接 |
| 常用收件 | `PATCH /users/me` | 已接 |
| 去識別化 | `DELETE /users/me/data` | Mock |

### 健康報告

| 能力 | 端點 | 狀態 |
|------|------|------|
| 上傳 | `POST /health-reports` | 已接 |
| 輪詢詳情 | `GET /health-reports/{id}` | 已接 |
| 重試擷取 | `POST /health-reports/{id}/retry` | 已接 |
| 擁有者校正 | `PATCH /health-reports/{id}/results/{result_id}` | Mock |

### Profile 問卷

| 能力 | 端點 | 狀態 |
|------|------|------|
| 下一題 | `GET /profile/questions/next` | 已接 |
| 作答 | `POST /profile/answers` | 已接 |

### 對話

| 能力 | 端點 | 狀態 |
|------|------|------|
| 建立 | `POST /conversations` | 已接 |
| 綁定報告 | `PATCH /conversation/{id}` | 已接 |
| 解除報告 | `DELETE /conversation/{id}/report` | 已接 |
| 設定目標 | `POST /conversation/{id}/goals` | 已接 |
| 確認價格帶 | `POST /conversation/{id}/package-plan/confirm` | 已接 |
| 同步訊息 | `POST /conversation/{id}/messages` | Mock |
| SSE 串流 | `POST /conversation/{id}/messages/stream` | 已接 |

### 建議與價格帶

| 能力 | 端點 | 狀態 |
|------|------|------|
| 產生建議 | `POST /recommendations` | 已接 |
| 上架價格帶 | `GET /package-plans` | 已接 |
| 血檢主檔列表 | `GET /lab-services` | 接線中（client 有方法，畫面未呼叫） |

### 訂單與付款

| 能力 | 端點 | 狀態 |
|------|------|------|
| 建單（`lines[]`） | `POST /orders` | 已接 |
| 列表 | `GET /orders` | 已接 |
| 詳情 | `GET /order/{id}` | 已接 |
| 重新付款 | `POST /order/{id}/payment` | Mock |
| 取消 | `POST /order/{id}/cancel` | Mock |
| 反查對話 | `GET /order/{id}/message` | 接線中 |
| Provider webhook | `POST /payments/{provider}/callback` | 不做 |

### 續約

| 能力 | 端點 | 狀態 |
|------|------|------|
| 待續約列表 | `GET /renewals/due` | Mock |
| 續約對話 | `POST /conversations`（`renewal_of_order_id`） | Mock |

### 命名改接

| 檢查項 | 狀態 |
|--------|------|
| 無 `AuthUser` 當識別子（實體用 `user`） | 已接 |
| 無 `plan`／`supplementPlan`／`basicCare`／`fullTune`（→ `package_plan`） | 接線中 |
| 無 `supplementItem`（→ `sellable_item`） | 接線中 |

### 技術債

| 項目 | 狀態 |
|------|------|
| `server/api/*` mock BFF 退役 | 未完成（M5） |

---

**最後更新**：2026-09-25（新增功能表；建議、`package-plans`、goals／價格帶確認、常用收件、解除報告綁定已接；訂單建單／列表／詳情已接；續約、重新付款、取消仍 Mock）
