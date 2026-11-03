# 對話路徑契約（client）

對齊 Irice 定案、candor-core draft #133（開場三選）與 [`docs/spec/30-path-frontend-contract.md`](https://github.com/DaydreamLab/candor-core/pull/139)（core #139／#140）。本檔為 FE 行為。

## 進站三選

| Code | 文案（zh） | 行為摘要 |
|------|------------|----------|
| A | 我想聊聊 | 可聊、可蒐基本；完成 CTA 由 core stripOfferRecommend 決定（FE 不依 path 再藏） |
| B | 我想諮詢健康方案 | 必填四欄→可問 optional／goals→完成 CTA（信 RA） |
| C | 幫我看報告 | 先上傳；取消→B；已有報告則補基本→完成 CTA（信 RA） |

進頁即 `POST /conversations`（**不帶 path**）→ core 寫入開場白並附 `reply_actions` `path_switch` a／b／c；前台顯示開場白，三鈕在其下（以 core label 為準；缺 RA 時才 fallback `PATH_ENTRY_OPTIONS`）。點鈕呼叫 `POST …/path` 首次選路徑（不再建對話）。`journey.conversationPath` 由 path 回應 hydrate。帶 `report_id` 建對話仍強制 path=c、不出三鈕。未選路徑直接打字：FE 不禁輸入，照常送出；core 當 A 處理。

## `path` hydrate

- 來源：create／`POST …/path`／attach／SSE `done`／`GET …/messages` 的 `data.path`（小寫 `a|b|c`，未選 `null`）。
- FE 用最新回覆蓋過本機；**key 缺席**（#139 未合前）不覆寫。
- `null` → 本機當 A（`resolveEntryPath`），**不** POST null→`a`。

## 必填／出題

僅 `sex`／`age`／`height`／`weight`。optional profile + goals **不挡**完成 CTA。

Path B／C 出題只信後端 `reply_actions`／`flow_prompt`／`POST /profile/answers` 的 `next_question`。**不再**主動 `GET …/questions/next`（依賴 core #139）。

## 完成 CTA

- 只信 usable `reply_actions.offer_recommend`（core 在 A 已 strip）。
- FE 不再依 path A／path-null 藏完成鈕；journey 安全門（readonly／latest／pending／required ask）仍在。
- **❌ 不在** intentional none／degraded／缺 RA 時由 FE 強掛完成 CTA。
- 文案維持「取得專屬保健品方案」／hint「以上為 AI 對話資訊…」（#34）。

## 其他

- 上傳（Dock／對話）→ core attachReport 升 C；FE 只同步 ack.path（不再 POST …/path upload_promote）。
- C 等上傳：信 core `flow_prompt`／`ask_report`／`path_switch`；FE **刪** `pathCAwaitingUpload`。
- A→B：**僅** `path_switch`「我想諮詢健康方案」；A「繼續健康諮詢」留在 A，不切 B。
- C 不傳／取消→退 B。
- lab_report 問卷進行中：對話區**不預掛** upload／checkup（Dock 空列兩顆仍可點；#35 explainHighlights 常駐不改壞）。
- Path A 引導由 core 計數後寫入 `reply_actions`：≥10／≥20 皆為 `offer_checkup`＋`path_switch`（≥20 短路 LLM、空 `content`，氣泡／chip 文案 FE i18n）。FE 渲染該決策，不計回合、不自造引導鈕。
- A→B（`path_switch`／`guide_switch`）：`POST …/path` 後清掉引導 CTA；接續 stream／flow_prompt RA，避免只留確認句就停住。
- Path C 待上傳短路：空 `content`＋`ask_report`＋`offer_checkup`＋`path_switch`；文案 FE i18n。

## Feature flag

`nuxt.config` `public.pathContract`（`NUXT_PUBLIC_PATH_CONTRACT=0` 關閉）。

## Out of scope

- CTA chips 錯題另案
- 合併／ready／部署（本 PR draft only）
