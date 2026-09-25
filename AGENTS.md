# AGENTS.md — health-client-chat-younger 開發慣例

給 AI coding agent 與人類貢獻者的專案慣例。違反以下規則的 PR 應被拒絕。

本 repo 是 **消費者前台**（A 平台客人端／YOUNGER）。HTTP API、領域模型與評分邏輯在 **candor-core**；本專案只負責畫面、client 狀態與直連義務。

契約權威（勿在本 repo 另立相反規格）：

- 詞彙：[candor-core docs/spec/10-domain-model.md](https://github.com/DaydreamLab/candor-core/blob/main/docs/spec/10-domain-model.md)
- Client 義務：[spec 31](https://github.com/DaydreamLab/candor-core/blob/main/docs/spec/31-client-integration.md)
- 直連拓撲：[docs/05](https://github.com/DaydreamLab/candor-core/blob/main/docs/05-integration-architecture.md)
- 接線看板：[docs/04](https://github.com/DaydreamLab/candor-core/blob/main/docs/04-integration-progress.md)（本 repo 進度見 [docs/03-progress.md](docs/03-progress.md)；狀態變更須雙向同步）

## 硬規則

1. **命名以 candor-core domain 為準。** TypeScript 識別子、composables、Pinia store、路由 path／name、元件檔名使用 core 詞。禁止長期以 `AuthUser`、`plan`／`supplementPlan`／`basicCare`／`fullTune`、`supplementItem` 當識別子（對照 → `user`、`package_plan`／`package`、`sellable_item`）。使用者可見中文文案可用「方案」「會員」。
2. **Browser 直連 core。** 新功能經 `useCandorApi`／`$fetch` 打 `NUXT_PUBLIC_API_BASE`（預設 `http://localhost:8080/api/v1`）。**不得**為新能力新增或擴充 `server/api/*` mock BFF。既有 `server/api/*` 僅過渡，退役見 [docs/02-roadmap.md](docs/02-roadmap.md) M5。
3. **Token 只放 `localStorage`。** 鍵 `candor.guest.token`（guest／member 共用 user 管道）。禁止寫入 URL query／hash、前端 log 或可分享連結。
4. **不實作 payment webhook。** 不得呼叫或代理 `POST /payments/{provider}/callback`；sandbox／真實 provider 的 callback 只打 core。
5. **ClaimGuard 原文呈現。** `claim_guard` 為 `blocked` 時顯示安全提示原文，不得改寫、隱藏或以本地文案覆蓋；SSE 收到 `blocked` 須清空先前 delta。
6. **不在前端重排建議分數。** 畫面依 core 回傳的 rank／分數呈現；不得用售價、庫存或本地權重覆寫排序。價格只在選 `package_plan`／結帳組成時使用。
7. **不在聊天或 commit 中洩漏 secrets。** `.env`、API keys 永不進版控。
8. **接線狀態雙寫。** 改 Mock／接線中／已接／不做 時，同步更新本 repo [docs/03-progress.md](docs/03-progress.md) 與 candor-core `docs/04-integration-progress.md`。

## 目錄結構

```
health-client-chat-younger/
├── AGENTS.md
├── README.md
├── docs/                 # 總覽、架構、路線圖、進度、client spec
│   ├── figjam-mvp-flow.md
│   ├── color-inventory.md
│   └── spec/
├── app/
│   ├── components/
│   ├── composables/      # useCandorApi、useFirstOrderApi
│   ├── layouts/
│   ├── middleware/       # auth、chat-layout
│   ├── pages/            # /、/login、/chat、/app/**
│   ├── plugins/
│   ├── stores/           # auth、journey、orders
│   └── utils/            # candor-api 型別、checkout-schema 等
├── server/api/           # 殘留 mock；新功能禁止擴充
├── test/                 # unit（Vitest）、e2e（Playwright）
├── i18n/locales/
├── .cursor/rules/        # CI lint、FigJam 產品流
└── nuxt.config.ts
```

## 命名與金額

- Vue／TS：PascalCase 元件；method／property camelCase；API 欄位與型別對齊 OpenAPI（snake_case 欄位名可保留在 DTO）。
- 金額：TWD 整數元（含稅），與 core 一致。
- 新概念進畫面識別子前，先確認 core spec 10 已定義。

## 測試與 CI

- 單元：`pnpm test`（Vitest）。
- E2E：`pnpm test:e2e`（Playwright；煙霧與首單路徑）。
- Push／commit 前：`pnpm run lint` 與 `pnpm run typecheck` 必須通過（見 [.cursor/rules/ci-lint-before-commit.mdc](.cursor/rules/ci-lint-before-commit.mdc)）。

## 文件優先

行為變更若影響直連契約、畫面必接端點或命名，先更新本 repo `docs/spec/*.md` 與（必要時）candor-core spec／04，再改碼。
