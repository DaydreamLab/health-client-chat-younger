# 對話路徑契約（client）

對齊 Irice 定案（進站 A／B／C）。candor-core path API 並行 draft；本檔為 FE 可擴充契約。

## 進站三選

| Code | 文案（zh） | 行為摘要 |
|------|------------|----------|
| A | 我想聊聊 | 可聊、可蒐基本；**永不**顯示完成 CTA |
| B | 我想諮詢健康方案 | 必填四欄→可問 optional／goals→完成 CTA |
| C | 幫我看報告 | 先上傳；取消→B；已有報告則補基本→完成 CTA |

選後寫入 `journey.conversationPath`，並 `POST /conversation/{id}/path`（core 未上線時 soft-fail）。

## 必填

僅 `sex`／`age`／`height`／`weight`。optional profile + goals **不挡**完成 CTA（舊 triad 全清 profile 拿掉）。

Path B／C 必須把四欄問出／收齊（`ensureRequiredBasicsCollection`；core `next` 缺件時 FE placeholder）。

## 完成 CTA

- 僅 B／C；門檻＝基本四欄齊；A 永不顯示。
- 仍依 usable `reply_actions.offer_recommend` 投影。
- **❌ 不在** intentional none／degraded／缺 RA 時由 FE 強掛完成 CTA。
- 文案維持「取得專屬保健品方案」／hint「以上為 AI 對話資訊…」（#34）。

## 其他

- 上傳（Dock／對話）→一律升 C；記入對話。
- C 不傳／取消→退 B。
- lab_report 問卷進行中：對話區**不預掛** upload／checkup（Dock 空列兩顆仍可點；#35 explainHighlights 常駐不改壞）。
- Path A：≥15 soft 引導（checkup｜轉 B）；≥25 固定回覆只能轉 B。

## Feature flag

`nuxt.config` `public.pathContract`（`NUXT_PUBLIC_PATH_CONTRACT=0` 關閉）。

## Out of scope

- CTA chips 錯題另案
- 合併／ready／部署（本 PR draft only）
