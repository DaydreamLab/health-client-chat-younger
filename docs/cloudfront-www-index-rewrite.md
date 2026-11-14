# 正式站 www CloudFront：靜態頁改寫（candor-www-index-rewrite）

正式站 `www` 是 S3 REST＋CloudFront（無 S3 website index document）。`DefaultRootObject=index.html` 只對 `/` 有效。瀏覽器直接開或 F5 無副檔名路徑時，必須由 **viewer-request CloudFront Function** 把 URI 改寫成對應的 `…/index.html`，才能打到 `pnpm generate` 產物。

`/200.html` 只當 **最後的 404／403 備援**（自訂錯誤回應），不要當成一般內頁的正常來源。

`/login`、`/en/login` 與 `/chat` 一樣是 **CSR 殼**（`ssr: false`，generate 仍產出 `login/index.html`）。硬開／F5 仍靠 Function 改寫到該物件；從首頁 soft-nav 點「登入」不應依賴錯誤的首頁 HTML／payload。未掛 Function 時硬開 `/login` 仍會落到首頁——那是託管問題，不是 `ensureSession` 把訪客當會員。

本文件是 Function 程式碼與動態路由框架頁的 **repo 權威說明**。線上變更由 ops／Terraform 執行；**本 repo 的 CI／agent 不得改 AWS**。

相關：handoff 查核 `/cursor/stores/bot/handoff/route-refresh/`（`AUDIT.md`、`OPS_FIX.md`、`S3_PAGES.md`）。本機模擬：`scripts/cf-static-server.mjs`（與下列 Function 同規則）。

## Irice 原則

打包後**每個路由都要有自己的靜態頁**；動態內容在開啟後由 client 載入。動態 path param（訂單 id、expert-case id、wearable deviceId）無法在 build 時列舉，因此：

1. `pnpm generate` 為每個動態段產出 CSR 框架頁：`<prefix>/_/index.html`（`ssr: false`）。
2. CloudFront Function 把真實 id 的請求改寫到該框架頁；**瀏覽器網址不變**，Vue Router 讀 param 再打 API。
3. 靜態兄弟路徑（例如 `/app/orders/paid`）維持一般 `…/index.html` 改寫，不要進 `_` 框架。

常數與 prerender 種子見 `app/utils/static-route-shells.ts`。CI 用 `pnpm check:static-pages` 對照 `app/pages` 與 `.output/public`。

## 動態路由一覽（須有 `_` 框架頁）

| 頁面檔 | 瀏覽器路由 | 靜態框架檔 | Function 改寫 |
|---|---|---|---|
| `app/orders/[id].vue` | `/app/orders/:id`、`/en/app/orders/:id` | `app/orders/_/index.html`、`en/app/orders/_/index.html` | `:id`∉`paid`/`pay-failed`/`_` → `_/index.html` |
| `app/expert-cases/[id].vue` | `/app/expert-cases/:id`、`/en/...` | `app/expert-cases/_/index.html` 等 | 任一 id → `_/index.html` |
| `app/wearables/[deviceId].vue` | `/app/wearables/:deviceId`、`/en/...` | `app/wearables/_/index.html` 等 | 任一 deviceId（≠`_`）→ `_/index.html` |

`paid`／`pay-failed` 是獨立靜態頁，不是 `[id]`。crawl 產出的 `apple-watch` 等裝置 HTML 可留在 S3，但正式站直開／F5 一律走 `_` 框架（規則較單純）；client 仍依 URL 載入該裝置。

## Function（完整程式碼）

- 名稱建議：`candor-www-index-rewrite`
- Runtime：`cloudfront-js-2.0`
- Event：`viewer-request`（只掛 www distribution default behavior）
- 自訂錯誤：403／404 → `ResponsePagePath=/200.html`、`ResponseCode=200`

```javascript
async function handler(event) {
  var request = event.request;
  var uri = request.uri;

  // Normalize trailing slash (except root) before matching dynamic shells.
  if (uri !== '/' && uri.endsWith('/')) {
    uri = uri.substring(0, uri.length - 1);
  }

  // Dynamic path-param → CSR framework at /…/_/index.html
  // Keep in sync with app/utils/static-route-shells.ts + scripts/cf-static-server.mjs
  var shells = [
    { prefix: '/app/orders/', reserved: ['paid', 'pay-failed', '_'] },
    { prefix: '/en/app/orders/', reserved: ['paid', 'pay-failed', '_'] },
    { prefix: '/app/expert-cases/', reserved: ['_'] },
    { prefix: '/en/app/expert-cases/', reserved: ['_'] },
    { prefix: '/app/wearables/', reserved: ['_'] },
    { prefix: '/en/app/wearables/', reserved: ['_'] }
  ];

  for (var i = 0; i < shells.length; i++) {
    var rule = shells[i];
    if (uri.indexOf(rule.prefix) !== 0) {
      continue;
    }
    var rest = uri.substring(rule.prefix.length);
    if (!rest || rest.indexOf('/') !== -1) {
      continue;
    }
    var reserved = false;
    for (var j = 0; j < rule.reserved.length; j++) {
      if (rest === rule.reserved[j]) {
        reserved = true;
        break;
      }
    }
    if (!reserved) {
      request.uri = rule.prefix + '_/index.html';
      return request;
    }
    break;
  }

  // Extensionless → …/index.html (original www fix)
  if (uri.endsWith('/')) {
    request.uri = uri + 'index.html';
  } else {
    var last = uri.substring(uri.lastIndexOf('/') + 1);
    if (last.indexOf('.') === -1) {
      request.uri = uri + '/index.html';
    }
  }
  return request;
}
```

行為摘要：

| 輸入 URI | 改寫後 |
|---|---|
| `/` | `/index.html` |
| `/login`、`/app`、`/app/me` | `/login/index.html` 等 |
| `/app/orders` | `/app/orders/index.html` |
| `/app/orders/paid` | `/app/orders/paid/index.html` |
| `/app/orders/ord-123` | `/app/orders/_/index.html` |
| `/app/expert-cases/ec-1` | `/app/expert-cases/_/index.html` |
| `/app/wearables/apple-watch` | `/app/wearables/_/index.html` |
| `/_nuxt/x.js`、`/200.html` | 不動 |
| `/not-exist` | `/not-exist/index.html` → S3 miss → `/200.html` |

只改 `request.uri`，不回 301；querystring 原樣保留。

## 與現行 live 的差異（需 ops 更新）

若 live Function 仍是「僅副檔名判斷＋`…/index.html`」版本（見 handoff `OPS_FIX.md`），則任意訂單／expert-case id 仍會 miss 物件而落到 `/200.html`。應更新 Function 為上文完整程式碼，並確認：

1. `pnpm generate` 產物已含 `app/orders/_/index.html` 等框架頁並 sync 到 S3。
2. 403／404 自訂錯誤仍指向 `/200.html`（不是 `/index.html`）。
3. Terraform（candor-core `infra/terraform/cloudfront.tf`）之後應與 live 對齊，避免 drift。

**本 PR／本 repo 不執行 AWS 變更。**

## 本機怎麼驗（模擬 CloudFront）

```bash
pnpm generate
pnpm check:static-pages          # 路由對照表；缺頁即 fail
node scripts/cf-static-server.mjs &
# 另開 terminal：mock API 可沿用 test/e2e/spa-fallback.spec.ts 內嵌 server
pnpm test:e2e:spa
```

手動 curl：

```bash
curl -sI http://127.0.0.1:4173/app/orders/ord-demo
# 應為 200，body 為 orders/_ 框架（有 #__nuxt），不是首頁
curl -s http://127.0.0.1:4173/app/orders/ord-demo | head
curl -s http://127.0.0.1:4173/not-exist-xyz | wc -c   # 約等於 200.html
```

## beta（GitHub Pages）怎麼驗

beta 用 GitHub Pages：無副檔名路徑常先 **301** 補 `/`，再回該路徑的預渲染 HTML。動態 id 若沒有對應目錄，GH Pages 會 **真 404**（不會自動用 `_` 框架，也沒有 CloudFront Function）。

建議：

1. 確認靜態路由（`/login/`、`/app/`、`/chat/`、`/app/handoff/`）F5 仍停在該頁。
2. 動態路由在 beta 可改測已產出的框架路徑：`/app/orders/_/`（應 200），或接受 GH Pages 對未知 id 404；正式站才靠 Function 把 id 指到 `_`。
3. 不要用 beta 代替正式站的 Function 驗收；正式站驗 `/app/orders/<真實id>` 直開與 F5。

## 相關腳本

| 腳本 | 用途 |
|---|---|
| `pnpm generate` | `nuxt build --preset github_pages` |
| `pnpm check:static-pages` | 對照 `app/pages` ↔ `.output/public` |
| `scripts/cf-static-server.mjs` | 本機 CloudFront 規則 |
| `pnpm test:e2e:spa` | 靜態產物＋mock API 的 Playwright |
