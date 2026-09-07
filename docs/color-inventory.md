# YOUNGER A client 現況配色

給設計師換色、給工程對 token 用。來源：`app/assets/css/main.css`、`app/app.config.ts`。元件幾乎不寫死 hex，換色改 token，不要逐頁改 class。

設計師清冊：
- v1 舊色票（封存、勿改）：[`docs/designer/younger-color-inventory.html`](docs/designer/younger-color-inventory.html)
- v2 現行色票：[`docs/designer/younger-color-inventory-v2.html`](docs/designer/younger-color-inventory-v2.html)（雙擊用瀏覽器開）
- CSV：[`docs/designer/younger-color-tokens.csv`](docs/designer/younger-color-tokens.csv)（貼 Figma / Excel）

之後只交 6 個 **600** 錨點，跑 `pnpm colors:ramps`（`scripts/generate-color-ramps.mjs`）即可重算 50–950 與日夜映射。

## 怎麼換色

1. 改 600 錨點後重跑演算法，再貼回 `main.css` 的色階與語意色。
2. Nuxt UI 對應：
   - brand → primary
   - mist → neutral
   - forest → success
   - sand → warning
   - coral → error
   - lagoon → info
3. 日間 elevated `#FFFFFF`、夜間 elevated `#182734`（mist-900 與 800 之間）是色階外。
4. 圖表色日間夜間同一組，切夜間不會自動變暗。`--color-chart-primary` 跟 Primary 600。

## 夜間自動映射

同一套 11 階，`.dark` 只換用哪一階：

| 用途 | 日間 | 夜間 |
| --- | --- | --- |
| Primary / Success / Warning / Error / Info 主色 | 600 | 400 |
| 實心按鈕 Hover | 700 | 300 |
| Disabled（實心） | 300 + opacity 0.45 | 500 + opacity 0.45 |
| Neutral 頁面底 | 50 | 950 |
| Neutral 次底 / 邊線 | 100 / 200 | 900 / 800 |
| Neutral 正文 | 600 | 50 |
| Neutral 說明 / 更淡 | 500 / 400 | 400 / 500 |

## 語意色（換色優先）

畫面 class 如 `bg-default`、`text-highlighted` 對應這層，不是直接寫 `mist-50`。

### 背景與邊線

| Token | Class | 日間 | 夜間 | 用途 |
| --- | --- | --- | --- | --- |
| `--ui-bg` | `bg-default` | `#F7F9FA` = mist-50 | `#0D151D` = mist-950 | 頁面底：layout、聊天區 |
| `--ui-bg-muted` | `bg-muted` | `#F1F4F7` = mist-100 | `#131F29` = mist-900 | 次底、hover、AI 泡泡、nav 選中 |
| `--ui-bg-elevated` | `bg-elevated` | `#FFFFFF` **色階外** | `#182734` **色階外** | 卡片、header、input、user 泡泡、主按鈕字色 |
| `--ui-bg-accented` | `bg-accented` | `#DDE4EA` = mist-200 | `#213548` = mist-800 | 夜間 segmented 選中底 |
| `--ui-border` | `border-default` | `#DDE4EA` = mist-200 | `#213548` = mist-800 | 分隔線、卡片邊、健康環 track |

### 文字與主色

| Token | Class | 日間 | 夜間 | 用途 |
| --- | --- | --- | --- | --- |
| `--ui-text` / `--ui-text-highlighted` | `text-default` / `text-highlighted` | `#42698E` = mist-600 | `#F7F9FA` = mist-50 | 標題、正文 |
| `--ui-text-muted` / `--ui-text-toned` | `text-muted` | `#7490AC` = mist-500 | `#9FB3C5` = mist-400 | 說明文字、ghost 按鈕。toned 與 muted 同色 |
| `--ui-text-dimmed` | `text-dimmed` | `#9FB3C5` = mist-400 | `#7490AC` = mist-500 | 更淡輔助字 |
| `--ui-primary` | `text-primary` / `bg-primary` | `#0784B1` = brand-600 | `#5CAECC` = brand-400 | CTA、連結、focus ring、健康環、推薦 badge |
| `--ui-success` | `text-success` | `#009B8E` = forest-600 | `#58BDB5` = forest-400 | 指標正常 |
| `--ui-warning` | `text-warning` | `#C79B54` = sand-600 | `#DABD8F` = sand-400 | 指標偏低 |
| `--ui-error` | `text-error` | `#A83C47` = coral-600 | `#C67F86` = coral-400 | 登入錯誤、指標偏高 |
| `--ui-info` | `text-info` | `#629DE0` = lagoon-600 | `#98BFEB` = lagoon-400 | 資訊／公告 |

主按鈕 hover：日間 `brand-700` `#056487`，夜間 `brand-300` `#8EC7DC`。Disabled：日間 300、夜間 500，opacity 0.45。

## 色階 50–950

有標 **用** 的 step 是畫面有直接引用的；其餘仍要保留給 Nuxt UI hover／ring。

### brand → primary

| 50 | 100 | 200 | 300 | 400 | 500 | 600 | 700 | 800 | 900 | 950 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `#F0F7FA` | `#DAEDF3` | `#B6DBE8` | `#8EC7DC` **用** | `#5CAECC` **用** | `#2894BB` **用** | `#0784B1` **用** | `#056487` **用** | `#044860` | `#033142` | `#022430` |

- 600 日間主色、400 夜間主色、700／300 主按鈕 hover、300／500 disabled

### mist → neutral

| 50 | 100 | 200 | 300 | 400 | 500 | 600 | 700 | 800 | 900 | 950 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `#F7F9FA` **用** | `#F1F4F7` **用** | `#DDE4EA` **用** | `#C2CFDB` | `#9FB3C5` **用** | `#7490AC` **用** | `#42698E` **用** | `#324F6B` | `#213548` **用** | `#131F29` **用** | `#0D151D` **用** |

### forest → success

| 50 | 100 | 200 | 300 | 400 | 500 | 600 | 700 | 800 | 900 | 950 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `#EFF9F8` | `#D9F0EE` | `#B4E2DE` | `#8BD2CC` | `#58BDB5` **用** | `#22A89D` | `#009B8E` **用** | `#00766C` | `#00544D` | `#003A35` | `#002A26` |

- `text-success`：日間 600、夜間 400；未上線 `app-badge-started` 仍用 500／700

### sand → warning

| 50 | 100 | 200 | 300 | 400 | 500 | 600 | 700 | 800 | 900 | 950 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `#FCF9F5` | `#F7F0E6` | `#EFE2CD` | `#E6D2B1` | `#DABD8F` **用** | `#CFA86B` | `#C79B54` **用** | `#977640` | `#6C542E` | `#4A3A1F` | `#362A17` |

- `text-warning`：日間 600、夜間 400

### coral → error

| 50 | 100 | 200 | 300 | 400 | 500 | 600 | 700 | 800 | 900 | 950 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `#FAF3F4` | `#F2E2E4` | `#E6C6C9` | `#D7A6AB` | `#C67F86` **用** | `#B45660` | `#A83C47` **用** | `#802E36` | `#5B2126` | `#3F161B` | `#2D1013` |

- `text-error`：日間 600 `#A83C47`、夜間 400

### lagoon → info

| 50 | 100 | 200 | 300 | 400 | 500 | 600 | 700 | 800 | 900 | 950 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `#F5F9FD` | `#E8F0FA` | `#D1E2F6` | `#B8D2F1` | `#98BFEB` **用** | `#77AAE4` **用** | `#629DE0` **用** | `#4B77AA` | `#355579` | `#253B54` | `#1A2A3C` |

- `--ui-info` 日 600／夜 400；方案視覺區 radial 仍用 `--ui-color-info-500`

## 圖表色（日間夜間同一組）

| Token | Hex | 用途 |
| --- | --- | --- |
| `--color-chart-primary` | `#0784B1` | 營養、趨勢線 |
| `--color-chart-amber` | `#D9A441` | 代謝 |
| `--color-chart-blue` | `#5B9BD5` | 心血管 |
| `--color-chart-teal` | `#3BB8AA` | 解毒 |
| `--color-chart-purple` | `#8B7FC7` | 內分泌 |
| `--color-chart-rose` | `#D86B78` | 免疫 |
| `--color-chart-baseline` | `#A6B8B5` | **未使用** |

檔案：`app/utils/health-demo.ts`、`HealthTrendChart.vue`、`HealthSystemPie.vue`。

## 元件 × 顏色

| 元件 / 畫面 | 用到的顏色 | 出現位置 |
| --- | --- | --- |
| 頁面底、正文 | `bg-default`、`text-default` | `layouts/default.vue`、`layouts/member.vue` |
| Header / 側欄 / Footer | `bg-elevated`、`border-default`、`text-muted` | layouts、ChatPanel header |
| AppButton primary | 底 `--ui-primary`、字 elevated；hover 700／300；disabled 300／500 | 登入送出、多數 CTA、聊天送出 |
| AppButton outline | 邊 border、底 elevated、字 highlighted | 聊天「轉真人」 |
| AppButton ghost | 字 muted → hover highlighted | 頂部導覽 |
| LocaleSwitch / ColorModeSwitch | 容器 muted + border；選中日間 elevated+primary，夜間 accented | 頂部、側欄 |
| BrandMark | `text-highlighted`；focus `ring-primary/40` | 所有 header |
| 首頁 hero / 步驟 | `text-primary`、highlighted、muted | `pages/index.vue` |
| 方案 chip tab | `app-chip`；選中 `app-path-card-selected`（primary 邊 + 22% glow） | index 方案區 |
| 方案卡 | elevated + border；hover `border-primary/40`；選中 `ring-primary/30` | index |
| 方案 showcase | muted 底 + primary／lagoon radial；icon primary | index |
| 推薦 badge | primary 12% 底 + primary 字 | index、健康頁 demo |
| AccountUser 頭像 | `bg-primary/15`、`text-primary` | member 側欄 |
| 側欄導覽選中 | `app-nav-active`：highlighted + muted 底 | member layout |
| Chat 泡泡 | user elevated；assistant muted。**未用** `.app-bubble-user` | ChatPanel |
| Chat 快捷 chip | `app-chip` | ChatPanel |
| 登入 input | border、elevated；focus `ring-primary/40`；錯誤 `text-error` | `pages/login.vue` |
| 健康環 | track = border；value = primary | `pages/app/index.vue` |
| 趨勢圖 | chart-primary；點 fill elevated | HealthTrendChart |
| 系統圓餅 | 六色 `chart-*` | HealthSystemPie |
| 指標狀態 | ok success、low warning、high error | HealthMarkerAccordion |

共用 class（幾乎每頁）：`bg-default`、`bg-elevated`、`bg-muted`、`text-highlighted`、`text-muted`、`text-dimmed`、`text-primary`、`border-default`。

## 已定義但畫面沒接

| 項目 | 說明 |
| --- | --- |
| `.app-path-card` | 卡片樣式沒人用；只有 `.app-path-card-selected` 套在 chip 上 |
| `.app-chip-used` | 已用過的 chip 淡字，未接 |
| `.app-badge-started` / `.app-badge-pending` | 狀態 badge，未接 |
| `.app-bubble-user` | 主色 user 泡泡；聊天改用 elevated |
| `--color-chart-baseline` | 圖表基準線色，未接 |
| `--ui-text-toned` | 與 muted 同色 |
