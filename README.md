# YOUNGER 客人端 App

路徑：`~/Projects/health-client-chat-younger`

A 平台客人端（保健／健康數據 + AI 教練）。品牌 UI 走 YOUNGER Design System，不是把 Dashboard template 塗綠。

## 技術架構

### 前端（已裝）

| 技術 | 用途 |
| --- | --- |
| Nuxt 4 | 框架（Vue 3、SSR） |
| Vue 3 | UI |
| TypeScript | 全專案語法 |
| Nuxt UI v4 | 元件庫 |
| Tailwind CSS v4 | utility CSS；品牌色走 `@theme` token |
| Pinia | 登入與旅程狀態 |
| Zod | 表單送出時檢查（先用在登入） |
| @nuxtjs/i18n | 繁中預設 + 英文 |
| pnpm | 套件 |
| Node 22 | `.nvmrc` |

### 測試

| 技術 | 現況 |
| --- | --- |
| Vitest + Vue Test Utils + @nuxt/test-utils | 單元測試（方案規則） |
| Playwright | **只寫煙霧測試**：未登入首頁看得到 YOUNGER |

### 後端

| | 現在 | 之後 |
| --- | --- | --- |
| 會員、訂單、金流、預約 | Mock | PHP（UI 面板流程確認後進場） |
| AI Chat | `server/api/chat` 假回覆 | 同一支薄 BFF 再接模型；金鑰不進瀏覽器 |

### 產品規則

- 逛首頁、看方案可以不登入。
- 交給顧問、付款、要留下資料時強制登入。
- 未登入與已登入都有畫面。
- Chat 第一版只解釋報告與生活建議，不指定商品。
- 暫無 Logo，畫面用文字 YOUNGER + 品牌色。

## 常用指令

需要 Node 22（`nvm use`）。

```bash
pnpm install
pnpm dev
pnpm test
pnpm test:e2e
```

開發網址：http://localhost:3000

未登入首頁先用 Design Token + 原生 HTML，避免 Nuxt UI Primitive 在 Vue 3.5 水合時出錯。登入頁與會員 layout 仍使用 Nuxt UI，之後再把公開頁元件接回去。
