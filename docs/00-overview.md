# 00 — 專案總覽

## 問題定義

使用者難以自行解讀健檢報告，也缺乏可解釋的保健品建議路徑。本 app 是 **消費者前台**（A 平台客人端／YOUNGER）：讓人上傳報告、對話解讀、取得建議、選價格帶並下單付款，再查訂單與出貨狀態。

評分、組成與金流真相在 **candor-core**；本專案負責 UX 與 Browser 直連。

## 目標

- 逛首頁／方案可不登入；需要留下資料、結帳時走 guest → member。
- 上傳健檢報告並輪詢擷取結果；對話式解讀（SSE）。
- 依引擎建議選 `package_plan`、鎖定 `composition_hash` 建單，sandbox／真實金流回流後查單。
- 文案與建議呈現遵守 ClaimGuard（`blocked` 原文顯示）。

## 非目標

- 診斷、處方或取代臨床判斷。
- 自建 OCR／引擎／權重調校 UI（屬 core 與後台）。
- 產品 BFF（Browser 直連 core；見 candor-core docs/05）。
- Y 顧問諮詢內容、多租戶 org、簽核流程（屬舊 FigJam／後台示範範圍，本 app 不做）。
- 實作 payment provider webhook。

## 現行主路徑（對齊 core M8）

```text
guest／member → 上傳報告 → 對話解讀 → 建議 → 選 package_plan
  → 建單（composition_hash）→ 付款回流 → 查訂單
```

舊敘事「Chat 第一版不指定商品／之後另接 PHP」**不再**是現行目標；商品建議來自 core `POST /recommendations`，交易走 core 訂單 API。

## 使用者角色

| 角色 | 需求 |
|------|------|
| 訪客（`user.role=guest`） | 逛站、上傳、對話、看建議；結帳前升級 member |
| 會員（`user.role=member`） | 建單、常用收件、查訂單、續約（待接） |
| 工程／維運 | 對 local／cloud dev 的 `NUXT_PUBLIC_API_BASE` 驗收 |

Operator／後台角色不在本 app。

## 名詞（摘要）

完整對照以 [candor-core spec 10](https://github.com/DaydreamLab/candor-core/blob/main/docs/spec/10-domain-model.md) 為準。

| 名詞 | 本 app 語意 |
|------|-------------|
| User | 消費者；`guest` 或 `member` |
| Health report | 上傳的健檢報告與擷取結果 |
| Conversation | 對話會話；可綁報告、目標、確認價格帶 |
| Recommendation | 引擎建議（含 `packages[]`、`composition_hash`） |
| PackagePlan | 價格帶模板 |
| Package | 建單鎖定組成快照 |
| Order／OrderLine | 訂單與明細 |
| ClaimGuard | 合規過濾結果，畫面必須尊重 |

## 產品流程參考

- Live FigJam：[A-Y MVP 協作流程 v0](https://www.figma.com/board/nYWKdgK5iX2YaNZf9lEP6p/A-Y-MVP%E5%8D%94%E4%BD%9C%E6%B5%81%E7%A8%8B-v0?node-id=0-1)
- 專案快照：[figjam-mvp-flow.md](figjam-mvp-flow.md)（設計參考；主路徑以本檔與 core 契約為準）
- 品牌色：[color-inventory.md](color-inventory.md)

## 成功指標（初期）

| 指標 | 目標 |
|------|------|
| [docs/03](03-progress.md) 主路徑切片 | Auth／報告／對話 SSE／建議／建單列表詳情為 `已接` |
| 命名 | 無長期禁止識別子（見 AGENTS） |
| 本地／dev 驗收 | guest → 上傳 → 建議 → sandbox 建單可走通 |

## 相關

- 架構：[01-architecture.md](01-architecture.md)
- 路線圖：[02-roadmap.md](02-roadmap.md)
- 進度：[03-progress.md](03-progress.md)
- 畫面：[spec/10-screens.md](spec/10-screens.md)
- API client：[spec/11-api-client.md](spec/11-api-client.md)
