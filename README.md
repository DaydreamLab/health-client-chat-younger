# Candor 坦見 — 消費者前台（YOUNGER）

A 平台客人端：健檢報告解讀、對話、建議與下單。評分與交易真相在 [candor-core](https://github.com/DaydreamLab/candor-core)；本專案 Browser 直連其 `/api/v1`。

## 線上預覽

https://daydreamlab.github.io/health-client-chat-younger/

推到 `main` 後自動發 GitHub Pages（靜態站）。本地 `pnpm dev` 搭配 core（`NUXT_PUBLIC_API_BASE`）走真實 API。

## 技術棧

| 技術 | 用途 |
|------|------|
| Nuxt 4／Vue 3／TypeScript | 應用框架 |
| Nuxt UI v4／Tailwind v4 | 元件與品牌 token |
| Pinia | auth／journey／orders |
| Zod | 表單驗證 |
| @nuxtjs/i18n | 繁中預設 + 英文 |
| Vitest／Playwright | 單元／e2e |
| pnpm／Node 22 | 套件與 runtime |

## 文件索引

| 文件 | 說明 |
|------|------|
| [docs/00-overview.md](docs/00-overview.md) | 願景、目標、非目標、名詞 |
| [docs/01-architecture.md](docs/01-architecture.md) | 直連拓撲、模組邊界 |
| [docs/02-roadmap.md](docs/02-roadmap.md) | M0–M5 里程碑 |
| [docs/03-progress.md](docs/03-progress.md) | 接線進度看板（與 core 04 雙寫） |
| [docs/spec/10-screens.md](docs/spec/10-screens.md) | 路由與畫面 |
| [docs/spec/11-api-client.md](docs/spec/11-api-client.md) | CandorApi、token、SSE |
| [docs/figjam-mvp-flow.md](docs/figjam-mvp-flow.md) | FigJam 產品流快照 |
| [docs/color-inventory.md](docs/color-inventory.md) | 品牌色 |
| [AGENTS.md](AGENTS.md) | AI／貢獻者硬規則 |

Core 側：串接進度 [04](https://github.com/DaydreamLab/candor-core/blob/main/docs/04-integration-progress.md)、架構 [05](https://github.com/DaydreamLab/candor-core/blob/main/docs/05-integration-architecture.md)、契約 [spec 31](https://github.com/DaydreamLab/candor-core/blob/main/docs/spec/31-client-integration.md)。

## 產品規則（摘要）

- 逛首頁、看方案可以不登入；結帳與留下資料走 guest → member。
- 建議排序以 core 為準；ClaimGuard `blocked` 原文顯示。
- 新功能直連 core，不新增 `server/api` mock BFF。

## 常用指令

需要 Node 22（`nvm use`）。

```bash
cp .env.example .env   # NUXT_PUBLIC_API_BASE=http://localhost:8080/api/v1
pnpm install
pnpm dev
pnpm generate          # 靜態站（GitHub Pages）
pnpm run lint && pnpm run typecheck
pnpm test
pnpm test:e2e
```

開發網址：http://localhost:3000
