# YOUNGER A client 現況配色

給設計師換色、給工程對 token 用。來源：`app/assets/css/main.css`、`app/app.config.ts`。元件幾乎不寫死 hex，換色改 token，不要逐頁改 class。

給設計師轉寄：[`docs/designer/younger-color-inventory.html`](docs/designer/younger-color-inventory.html)（雙擊用瀏覽器開）、[`docs/designer/younger-color-tokens.csv`](docs/designer/younger-color-tokens.csv)（貼 Figma / Excel）。

## 怎麼換色

1. 先改**語意色**（`--ui-bg`、`--ui-text-*`、`--ui-primary`、`--ui-border`）。這層決定大多數畫面。
2. 品牌／語意色階請整條 50–950 一起給。Nuxt UI 對應：
   - brand → primary
   - mist → neutral
   - forest → success
   - sand → warning
   - coral → error
   - lagoon → info
3. 標了「色階外」的 hex **不會**跟著 mist 色階自動變。
4. 圖表色日間夜間同一組，切夜間不會自動變暗。

## 語意色（換色優先）

畫面 class 如 `bg-default`、`text-highlighted` 對應這層，不是直接寫 `mist-50`。

### 背景與邊線

| Token | Class | 日間 | 夜間 | 用途 |
| --- | --- | --- | --- | --- |
| `--ui-bg` | `bg-default` | `#F7FAF9` = mist-50 | `#061C19` = mist-950 | 頁面底：layout、聊天區 |
| `--ui-bg-muted` | `bg-muted` | `#F0F6F5` = mist-100 | `#092824` = mist-900 | 次底、hover、AI 泡泡、nav 選中 |
| `--ui-bg-elevated` | `bg-elevated` | `#FFFFFF` **色階外** | `#0D332E` **色階外** | 卡片、header、input、user 泡泡、主按鈕字色 |
| `--ui-bg-accented` | `bg-accented` | `#DCE8E6` = mist-200 | `#1B403B` = mist-800 | 夜間 segmented 選中底 |
| `--ui-border` | `border-default` | `#DCE8E6` = mist-200 | `#1B403B` = mist-800 | 分隔線、卡片邊、健康環 track |

### 文字與主色

| Token | Class | 日間 | 夜間 | 用途 |
| --- | --- | --- | --- | --- |
| `--ui-text` / `--ui-text-highlighted` | `text-default` / `text-highlighted` | `#12302D` **色階外** | `#E8F5F2` **色階外** | 標題、正文 |
| `--ui-text-muted` / `--ui-text-toned` | `text-muted` | `#55706C` = mist-600 | `#A8C1BD` **色階外** | 說明文字、ghost 按鈕。toned 與 muted 同色 |
| `--ui-text-dimmed` | `text-dimmed` | `#829692` = mist-500 | `#718F8A` **色階外** | 更淡輔助字 |
| `--ui-primary` | `text-primary` / `bg-primary` | `#009B8E` = brand-600 | `#4CCEC1` = brand-400 | CTA、連結、focus ring、健康環、推薦 badge |

主按鈕 hover：日間 `brand-700` `#00766C`，夜間 `brand-300` `#82DED5`。

## 色階 50–950

有標 **用** 的 step 是畫面有直接引用的；其餘仍要保留給 Nuxt UI hover／ring。

### brand → primary

| 50 | 100 | 200 | 300 | 400 | 500 | 600 | 700 | 800 | 900 | 950 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `#EFFAF8` | `#D8F3EF` | `#AFE9E3` | `#82DED5` **用** | `#4CCEC1` **用** | `#18B7A7` | `#009B8E` **用** | `#00766C` **用** | `#00544D` | `#003A35` | `#002A26` |

- 600 日間主色、400 夜間主色、700／300 主按鈕 hover

### mist → neutral

| 50 | 100 | 200 | 300 | 400 | 500 | 600 | 700 | 800 | 900 | 950 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `#F7FAF9` **用** | `#F0F6F5` **用** | `#DCE8E6` **用** | `#C5D4D1` | `#A6B8B5` | `#829692` **用** | `#55706C` **用** | `#3D5552` | `#1B403B` **用** | `#092824` **用** | `#061C19` **用** |

### forest → success

| 50 | 100 | 200 | 300 | 400 | 500 | 600 | 700 | 800 | 900 | 950 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `#E8F7F2` | `#C7EDE1` | `#96DCC7` | `#5DC4A6` | `#2EAB8A` | `#159570` **用** | `#117A5C` | `#0E614A` **用** | `#0C4D3B` | `#0A3B2E` | `#06241C` |

- `text-success`：健康指標正常；未上線 `app-badge-started` 用 500／700

### sand → warning

| 50 | 100 | 200 | 300 | 400 | 500 | 600 | 700 | 800 | 900 | 950 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `#FBF6EA` | `#F4E7C8` | `#EAD29A` | `#E0B96A` | `#D69B32` | `#C48A28` **用** | `#A37120` | `#82591A` | `#644414` | `#4A330F` | `#2C1E08` |

- `text-warning`：指標偏低

### coral → error

| 50 | 100 | 200 | 300 | 400 | 500 | 600 | 700 | 800 | 900 | 950 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `#FBECEE` | `#F5D0D4` | `#ECA8B0` | `#E2828C` | `#D85C68` | `#C94A56` **用** | `#A83C47` | `#873038` | `#68252C` | `#4C1B20` | `#2E1014` |

- `text-error`：登入錯誤、指標偏高

### lagoon → info

| 50 | 100 | 200 | 300 | 400 | 500 | 600 | 700 | 800 | 900 | 950 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `#EAF4F7` | `#CDE4EB` | `#A5CDD9` | `#77B3C4` | `#4A91A8` | `#3B7A8F` **用** | `#306575` | `#27505E` | `#1E3E49` | `#162E36` | `#0C1C21` |

- 方案視覺區 radial：`--ui-color-info-500`

## 圖表色（日間夜間同一組）

| Token | Hex | 用途 |
| --- | --- | --- |
| `--color-chart-primary` | `#009B8E` | 營養、趨勢線 |
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
| AppButton primary | 底 `--ui-primary`、字 elevated；hover 700／300 | 登入送出、多數 CTA |
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
