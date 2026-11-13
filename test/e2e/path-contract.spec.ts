import type { Page } from '@playwright/test'
import { expect, test } from '@nuxt/test-utils/playwright'
import {
  FLOW_V2_GREETING_CONSULT,
  FLOW_V2_PATH_C_AWAIT_UPLOAD,
  FLOW_V2_PATH_C_BASICS,
  mockCandorAuth
} from './mock-candor-auth'

async function seedNoExpertCase(page: Page) {
  await page.route('**/api/v1/expert-case-reviews**', async (route) => {
    if (route.request().method() !== 'GET') {
      await route.fallback()
      return
    }
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        status: 'success',
        data: { expert_case_reviews: [] }
      })
    })
  })
  await page.route('**/api/v1/conversation/*/expert-review', async (route) => {
    if (route.request().method() === 'GET') {
      await route.fulfill({
        status: 404,
        contentType: 'application/json',
        body: JSON.stringify({
          status: 'failed',
          error_message: 'Expert review not found.',
          error_code: 'not_found'
        })
      })
      return
    }
    await route.fallback()
  })
}

async function openFreshChat(page: Page, goto: (path: string, opts?: { waitUntil?: 'hydration' }) => Promise<unknown>) {
  await page.setViewportSize({ width: 1280, height: 800 })
  // Clear journey BEFORE first /chat mount — entry now POSTs /conversations on
  // mount; a leftover reportId would attach＋stream and steal path before 進站三選.
  await goto('/', { waitUntil: 'hydration' })
  await page.evaluate(() => {
    localStorage.removeItem('candor.unpaid.journey')
  })
  await goto('/chat', { waitUntil: 'hydration' })
  await expect(page.getByTestId('chat-transcript')).toBeVisible({ timeout: 20_000 })
}

/** Entry chips from greeting.reply_actions path_switch (codes a／b／c). */
async function selectEntryPath(page: Page, path: 'A' | 'B' | 'C') {
  const code = path.toLowerCase()
  const chip = page.getByTestId(`chat-quiz-option-${code}`)
  await expect(chip).toBeVisible({ timeout: 15_000 })
  await chip.click()
  // onChoice fires void selectConversationPath — wait until entry `c` chip clears
  // (path POST done). Path C flow_prompt may still show a／b switch chips.
  await expect(page.getByTestId('chat-quiz-option-c')).toHaveCount(0, { timeout: 15_000 })
}

async function finishGoalSelect(page: Page) {
  await expect(page.getByTestId('chat-quiz-option-sleep')).toBeVisible({ timeout: 15_000 })
  await page.getByTestId('chat-quiz-option-sleep').click()
  await page.getByTestId('chat-quiz-confirm').click()
  await expect(page.getByTestId('chat-quiz-confirm')).toHaveCount(0, { timeout: 15_000 })
}

async function sendChatLine(page: Page, text: string) {
  const input = page.getByTestId('chat-input')
  await expect(input).toBeVisible({ timeout: 15_000 })
  await input.fill(text)
  await page.getByTestId('chat-send').click()
}

test.describe('path contract (A／B／C)', () => {
  test('進站三選：A／B／C chips 可見', async ({ page, goto }) => {
    test.setTimeout(90_000)
    await mockCandorAuth(page, {
      asMember: true,
      conversationPath: null,
      basicProfileComplete: false
    })
    await seedNoExpertCase(page)
    await openFreshChat(page, goto)

    const transcript = page.getByTestId('chat-transcript')
    await expect(transcript).toContainText(FLOW_V2_GREETING_CONSULT, { timeout: 15_000 })
    await expect(transcript).toContainText('想先從哪裡開始？')
    await expect(page.getByTestId('chat-quiz-option-a')).toBeVisible({ timeout: 15_000 })
    await expect(page.getByTestId('chat-quiz-option-b')).toBeVisible()
    await expect(page.getByTestId('chat-quiz-option-c')).toBeVisible()
    await expect(page.getByTestId('chat-quiz-option-a')).toHaveText('我想聊聊')
    await expect(page.getByTestId('chat-quiz-option-b')).toHaveText('我想諮詢健康方案')
    await expect(page.getByTestId('chat-quiz-option-c')).toHaveText('幫我看報告')
    // 開場白在上、三鈕在下
    const text = await transcript.innerText()
    expect(text.indexOf(FLOW_V2_GREETING_CONSULT)).toBeLessThan(text.indexOf('我想聊聊'))
    await expect(page.getByTestId('chat-view-recommend')).toHaveCount(0)
  })

  const removedLocalOpeners = [
    '好的，我們先聊聊',
    '好的，我們來了解你的基本狀況',
    '好的，請上傳近期健檢',
    '你好，想聊什麼都可以',
    '請先上傳血檢或健檢報告；若不傳可改為諮詢健康方案'
  ]

  test('path A：選項當一般訊息送出；開場白在上、三鈕在下', async ({ page, goto }) => {
    test.setTimeout(90_000)
    await mockCandorAuth(page, {
      asMember: true,
      conversationPath: null,
      basicProfileComplete: true
    })
    await seedNoExpertCase(page)
    await openFreshChat(page, goto)

    const before = page.getByTestId('chat-transcript')
    await expect(before).toContainText(FLOW_V2_GREETING_CONSULT, { timeout: 15_000 })
    const beforeText = await before.innerText()
    expect(beforeText.indexOf(FLOW_V2_GREETING_CONSULT)).toBeLessThan(beforeText.indexOf('我想聊聊'))

    await selectEntryPath(page, 'A')

    const transcript = page.getByTestId('chat-transcript')
    await expect(transcript).toContainText('我想聊聊', { timeout: 15_000 })
    await expect(transcript).toContainText(FLOW_V2_GREETING_CONSULT, { timeout: 15_000 })
    const text = await transcript.innerText()
    // 選後仍維持資料庫順序：開場白 → 使用者選項
    expect(text.indexOf(FLOW_V2_GREETING_CONSULT)).toBeLessThan(text.indexOf('我想聊聊'))
    for (const opener of removedLocalOpeners) {
      await expect(transcript).not.toContainText(opener)
    }
    // A：不走 goals；create 也不回 goals chips。
    await expect(page.getByTestId('chat-quiz-option-sleep')).toHaveCount(0)
  })

  test('訪客開場不點選項、直接打字 Enter → 隱式路徑 A、訊息送出、三鈕收起', async ({ page, goto }) => {
    test.setTimeout(90_000)
    await mockCandorAuth(page, {
      asMember: false,
      conversationPath: null,
      basicProfileComplete: true
    })
    await seedNoExpertCase(page)
    await openFreshChat(page, goto)

    const transcript = page.getByTestId('chat-transcript')
    await expect(transcript).toContainText(FLOW_V2_GREETING_CONSULT, { timeout: 15_000 })
    await expect(page.getByTestId('chat-quiz-option-a')).toBeVisible({ timeout: 15_000 })
    await expect(page.getByTestId('chat-quiz-option-b')).toBeVisible()
    await expect(page.getByTestId('chat-quiz-option-c')).toBeVisible()

    const typed = '想問睡眠怎麼改善'
    const pathPost = page.waitForRequest((req) => {
      if (req.method() !== 'POST' || !req.url().includes('/path')) {
        return false
      }
      const body = req.postData() || ''
      return body.includes('"path":"a"') || body.includes('"path": "a"')
    }, { timeout: 20_000 })
    const streamPost = page.waitForRequest((req) => {
      if (req.method() !== 'POST' || !req.url().includes('/messages/stream')) {
        return false
      }
      return (req.postData() || '').includes(typed)
    }, { timeout: 20_000 })

    const input = page.getByTestId('chat-input')
    await expect(input).toBeVisible({ timeout: 15_000 })
    await expect(input).toBeEnabled()
    await input.fill(typed)
    await expect(input).toHaveValue(typed)
    await input.press('Enter')

    await pathPost
    await streamPost
    await expect(transcript).toContainText(typed, { timeout: 15_000 })
    // 三鈕收起（含 entry c；path A 不會再掛 path_switch c）
    await expect(page.getByTestId('chat-quiz-option-a')).toHaveCount(0, { timeout: 15_000 })
    await expect(page.getByTestId('chat-quiz-option-b')).toHaveCount(0)
    await expect(page.getByTestId('chat-quiz-option-c')).toHaveCount(0)
    // 真的送出後才清；不可無故殘留或誤清後什麼都沒送
    await expect(input).toHaveValue('')
  })

  test('path B：選項當一般訊息送出 → stream 回 goals；開場白在上、三鈕在下', async ({ page, goto }) => {
    test.setTimeout(90_000)
    await mockCandorAuth(page, {
      asMember: true,
      conversationPath: null,
      basicProfileComplete: false
    })
    await seedNoExpertCase(page)
    await openFreshChat(page, goto)

    const before = page.getByTestId('chat-transcript')
    await expect(before).toContainText(FLOW_V2_GREETING_CONSULT, { timeout: 15_000 })
    const beforeText = await before.innerText()
    expect(beforeText.indexOf(FLOW_V2_GREETING_CONSULT)).toBeLessThan(beforeText.indexOf('我想諮詢健康方案'))

    await selectEntryPath(page, 'B')

    const transcript = page.getByTestId('chat-transcript')
    await expect(transcript).toContainText('我想諮詢健康方案', { timeout: 15_000 })
    await expect(transcript).toContainText(FLOW_V2_GREETING_CONSULT, { timeout: 15_000 })
    const text = await transcript.innerText()
    expect(text.indexOf(FLOW_V2_GREETING_CONSULT)).toBeLessThan(text.indexOf('我想諮詢健康方案'))
    for (const opener of removedLocalOpeners) {
      await expect(transcript).not.toContainText(opener)
    }
    // Goals come from the entry stream reply（not create／not GET next）.
    await expect(page.getByTestId('chat-quiz-option-sleep')).toBeVisible({ timeout: 15_000 })
  })

  test('path C：選完顯示 greeting + flow_prompt 上傳引導，無路徑專屬本地句', async ({ page, goto }) => {
    test.setTimeout(90_000)
    // Keep C copy constants pinned to SPEC（後端回／FE i18n 對齊用）。
    expect(FLOW_V2_PATH_C_AWAIT_UPLOAD).toContain('請上傳血檢或健檢報告')
    expect(FLOW_V2_PATH_C_BASICS).toContain('報告收到了')

    await mockCandorAuth(page, {
      asMember: true,
      conversationPath: null,
      basicProfileComplete: false
    })
    await seedNoExpertCase(page)
    await openFreshChat(page, goto)
    await selectEntryPath(page, 'C')

    const transcript = page.getByTestId('chat-transcript')
    await expect(transcript).toContainText(FLOW_V2_GREETING_CONSULT, { timeout: 15_000 })
    await expect(transcript).toContainText(FLOW_V2_PATH_C_AWAIT_UPLOAD, { timeout: 15_000 })
    for (const opener of removedLocalOpeners) {
      await expect(transcript).not.toContainText(opener)
    }
  })

  test('path A：usable offer_recommend 仍不顯示完成 CTA', async ({ page, goto }) => {
    test.setTimeout(90_000)
    await mockCandorAuth(page, {
      asMember: true,
      conversationPath: null,
      basicProfileComplete: true,
      replyActions: 'offer_recommend'
    })
    await seedNoExpertCase(page)
    await openFreshChat(page, goto)
    await selectEntryPath(page, 'A')

    const input = page.getByTestId('chat-input')
    await input.fill('聊聊睡眠')
    await page.getByTestId('chat-send').click()

    const last = page.getByTestId('chat-last-reply')
    await expect(last).toBeVisible({ timeout: 15_000 })
    await expect(last.getByTestId('chat-view-recommend')).toHaveCount(0)
  })

  test('path B：goals 後才問 sex；完成 CTA 依 RA', async ({ page, goto }) => {
    test.setTimeout(90_000)
    await mockCandorAuth(page, {
      asMember: true,
      conversationPath: null,
      basicProfileComplete: false,
      replyActions: 'offer_recommend'
    })
    await seedNoExpertCase(page)
    await openFreshChat(page, goto)
    await selectEntryPath(page, 'B')

    await finishGoalSelect(page)
    await expect(page.getByTestId('chat-quiz-option-F')).toBeVisible({ timeout: 15_000 })
    await expect(page.getByTestId('chat-view-recommend')).toHaveCount(0)
  })

  test('path B：基本齊 + usable offer_recommend → 完成 CTA；文案不改壞', async ({ page, goto }) => {
    test.setTimeout(90_000)
    await mockCandorAuth(page, {
      asMember: true,
      conversationPath: null,
      basicProfileComplete: true,
      replyActions: 'offer_recommend'
    })
    await seedNoExpertCase(page)
    await openFreshChat(page, goto)
    await selectEntryPath(page, 'B')

    await finishGoalSelect(page)
    await sendChatLine(page, '請給方案')

    const last = page.getByTestId('chat-last-reply')
    await expect(last.getByTestId('chat-view-recommend')).toBeVisible({ timeout: 15_000 })
    await expect(last.getByTestId('chat-view-recommend')).toHaveText('查看推薦方案')
  })

  test('path B：基本齊 + RA none → 不硬掛完成 CTA', async ({ page, goto }) => {
    test.setTimeout(90_000)
    await mockCandorAuth(page, {
      asMember: true,
      conversationPath: null,
      basicProfileComplete: true,
      replyActions: 'none'
    })
    await seedNoExpertCase(page)
    await openFreshChat(page, goto)
    await selectEntryPath(page, 'B')

    await finishGoalSelect(page)
    await sendChatLine(page, '還有嗎')

    const last = page.getByTestId('chat-last-reply')
    await expect(last).toBeVisible({ timeout: 15_000 })
    await expect(last.getByTestId('chat-view-recommend')).toHaveCount(0)
  })

  test('path C：flow_prompt 上傳引導＋A／B 兩鈕（無 checkup）', async ({ page, goto }) => {
    test.setTimeout(90_000)
    await mockCandorAuth(page, {
      asMember: true,
      conversationPath: null,
      basicProfileComplete: false
    })
    await seedNoExpertCase(page)
    await openFreshChat(page, goto)
    await selectEntryPath(page, 'C')

    const transcript = page.getByTestId('chat-transcript')
    await expect(transcript).toContainText(FLOW_V2_PATH_C_AWAIT_UPLOAD, { timeout: 15_000 })
    const last = page.getByTestId('chat-last-reply')
    await expect(last.getByTestId('chat-message-checkup')).toHaveCount(0)
    await expect(last.getByTestId('chat-message-upload')).toBeVisible()
    await expect(last.getByTestId('chat-quiz-option-a')).toHaveText('我想聊聊')
    await expect(last.getByTestId('chat-quiz-option-b')).toHaveText('我想諮詢健康方案')
  })

  test('path B：create flow_prompt goals RA 顯示；不打 questions/next', async ({ page, goto }) => {
    test.setTimeout(90_000)
    const nextCalls: string[] = []
    page.on('request', (req) => {
      if (req.url().includes('/profile/questions/next')) {
        nextCalls.push(req.url())
      }
    })
    await mockCandorAuth(page, {
      asMember: true,
      conversationPath: null,
      basicProfileComplete: false,
      bOpeningFlowPromptRa: true
    })
    await seedNoExpertCase(page)
    await openFreshChat(page, goto)
    await selectEntryPath(page, 'B')

    const last = page.getByTestId('chat-last-reply')
    await expect(last.getByTestId('chat-quiz-option-sleep')).toBeVisible({ timeout: 15_000 })
    // Opening RA may move onto the entry stream bubble; still only one goals host.
    await expect(page.getByTestId('chat-quiz-option-sleep')).toHaveCount(1)
    expect(nextCalls).toEqual([])
  })

  test('path B：hydrate 開場 consultation_goals RA；不打 questions/next', async ({ page, goto }) => {
    test.setTimeout(90_000)
    const nextCalls: string[] = []
    page.on('request', (req) => {
      if (req.url().includes('/profile/questions/next')) {
        nextCalls.push(req.url())
      }
    })
    await mockCandorAuth(page, {
      asMember: true,
      conversationPath: 'B',
      basicProfileComplete: false,
      replyActions: 'consultation_goals'
    })
    await seedNoExpertCase(page)
    await page.setViewportSize({ width: 1280, height: 800 })
    await page.addInitScript((journey) => {
      localStorage.setItem('candor.unpaid.journey', JSON.stringify(journey))
    }, {
      conversationId: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
      conversationPath: 'B',
      messages: [
        {
          id: 'stale-user',
          role: 'user',
          parts: [{ type: 'text', text: '我想諮詢健康方案' }]
        },
        {
          id: 'stale-assistant',
          role: 'assistant',
          parts: [{ type: 'text', text: '本機舊開場' }]
        }
      ],
      hasAnalysis: false,
      selectedPackageCode: null,
      reportId: null,
      reportDockOpen: false,
      reportDockCollapsed: true,
      reportInterpretSent: false,
      selectedPackage: null,
      packageConfirmed: false,
      goalSelectActive: false,
      reportAskActive: false,
      goalOptions: [],
      selectedCodes: [],
      quizActive: false,
      activeQuestion: null,
      postQuizGuided: false,
      profileGaps: [],
      clarifyingGoals: [],
      expertReviewStatus: 'none'
    })
    await goto('/chat', { waitUntil: 'hydration' })

    const last = page.getByTestId('chat-last-reply')
    await expect(last).toContainText('先選您想改善的健康方向', { timeout: 15_000 })
    await expect(last.getByTestId('chat-quiz-option-sleep')).toBeVisible({ timeout: 15_000 })
    await expect(page.getByText('本機舊開場')).toHaveCount(0)
    expect(nextCalls).toEqual([])
  })

  test('path C：attach flow_prompt RA → 自動送後搬到新助理則', async ({ page, goto }) => {
    test.setTimeout(120_000)
    await mockCandorAuth(page, {
      asMember: true,
      conversationPath: null,
      basicProfileComplete: true,
      attachFlowPromptRa: 'consultation_goals'
    })
    await seedNoExpertCase(page)
    await openFreshChat(page, goto)
    await selectEntryPath(page, 'C')

    const streamAck = page.waitForRequest((req) => {
      if (req.method() !== 'POST' || !req.url().includes('/messages/stream')) {
        return false
      }
      return (req.postData() || '').includes('我的報告已上傳')
    }, { timeout: 30_000 })

    await page.getByTestId('chat-message-upload').click()
    await page.setInputFiles('[data-testid="chat-upload-input"]', {
      name: 'report.pdf',
      mimeType: 'application/pdf',
      buffer: Buffer.from('%PDF-1.4 mock')
    })

    const transcript = page.getByTestId('chat-transcript')
    await expect(transcript).toContainText(FLOW_V2_PATH_C_BASICS, { timeout: 30_000 })
    await streamAck
    await expect(transcript).toContainText('我的報告已上傳')

    const last = page.getByTestId('chat-last-reply')
    await expect(last.getByTestId('chat-quiz-option-sleep')).toBeVisible({ timeout: 15_000 })
    await expect(page.getByTestId('chat-quiz-option-sleep')).toHaveCount(1)
  })

  test('path C：自動送失敗時保留錯誤提示＋再試一次（不靜默刪泡泡）', async ({ page, goto }) => {
    // run15: SSE error keeps the assistant bubble with a retry tip; do not discard
    // and re-host flow_prompt CTAs as if the follow-up never happened.
    test.setTimeout(120_000)
    await mockCandorAuth(page, {
      asMember: true,
      conversationPath: null,
      basicProfileComplete: true,
      attachFlowPromptRa: 'consultation_goals',
      failReportUploadedAckStream: true
    })
    await seedNoExpertCase(page)
    await openFreshChat(page, goto)
    await selectEntryPath(page, 'C')

    await page.getByTestId('chat-message-upload').click()
    await page.setInputFiles('[data-testid="chat-upload-input"]', {
      name: 'report.pdf',
      mimeType: 'application/pdf',
      buffer: Buffer.from('%PDF-1.4 mock')
    })

    const transcript = page.getByTestId('chat-transcript')
    await expect(transcript).toContainText(FLOW_V2_PATH_C_BASICS, { timeout: 30_000 })
    await expect(transcript).toContainText('我的報告已上傳', { timeout: 15_000 })

    const last = page.getByTestId('chat-last-reply')
    await expect(last).toContainText('回覆暫時無法取得', { timeout: 15_000 })
    await expect(last.getByTestId('chat-report-retry')).toBeVisible()
    await expect(last.getByTestId('chat-report-retry')).toHaveText('再試一次')
    await expect(last.getByTestId('chat-quiz-option-sleep')).toHaveCount(0)
  })

  test('path B：goals 掛著時打字走 stream，不打 POST /goals', async ({ page, goto }) => {
    // Irice 2026-11-13：自由打字交由 messages/stream；按鈕作答仍 POST /goals。
    test.setTimeout(90_000)
    const conversationId = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
    const goalsPosts: string[] = []
    const streamBodies: string[] = []

    await mockCandorAuth(page, {
      asMember: true,
      conversationPath: null,
      basicProfileComplete: false
    })
    await seedNoExpertCase(page)
    page.on('request', (req) => {
      if (req.method() !== 'POST') {
        return
      }
      const url = req.url()
      if (url.includes(`/conversation/${conversationId}/goals`)) {
        goalsPosts.push(req.postData() || '')
      }
      if (url.includes('/messages/stream')) {
        streamBodies.push(req.postData() || '')
      }
    })
    await openFreshChat(page, goto)
    await selectEntryPath(page, 'B')
    await expect(page.getByTestId('chat-quiz-option-sleep')).toBeVisible({ timeout: 15_000 })

    const typed = '想先問睡眠怎麼改善'
    const streamReq = page.waitForRequest((req) => {
      if (req.method() !== 'POST' || !req.url().includes('/messages/stream')) {
        return false
      }
      return (req.postData() || '').includes(typed)
    }, { timeout: 20_000 })

    const input = page.getByTestId('chat-input')
    await input.fill(typed)
    await page.getByTestId('chat-send').click()
    await streamReq

    expect(streamBodies.some(body => body.includes(typed))).toBe(true)
    expect(goalsPosts.some(body => body.includes('raw_text') || body.includes(typed))).toBe(false)
    await expect(page.getByTestId('chat-transcript')).toContainText(typed, { timeout: 15_000 })
  })

  test('hydrate 保留路徑 C 本地使用者訊息且不重複', async ({ page, goto }) => {
    test.setTimeout(90_000)
    const conversationId = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
    const pathCLabel = '幫我看報告'
    const uploadedLabel = '已上傳 report.pdf'

    await mockCandorAuth(page, {
      asMember: true,
      conversationPath: 'C',
      basicProfileComplete: false,
      replyActions: 'consultation_goals'
    })
    await seedNoExpertCase(page)

    // Override history: server has greeting＋goals, omits path-C／upload user turns.
    await page.route(`**/api/v1/conversation/${conversationId}/messages`, async (route) => {
      if (route.request().method() !== 'GET') {
        await route.fallback()
        return
      }
      if (route.request().url().includes('/messages/stream')) {
        await route.fallback()
        return
      }
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          status: 'success',
          data: {
            conversation_id: conversationId,
            path: 'c',
            messages: [
              {
                id: 'greet-e2e',
                role: 'assistant',
                content: `${FLOW_V2_GREETING_CONSULT}\n\n想先從哪裡開始？`,
                reply_actions: {
                  schema_version: '0.1',
                  source: 'engine',
                  adaptor: 'fake',
                  degraded: false,
                  error: null,
                  actions: [{ type: 'none' }]
                }
              },
              {
                id: 'msg-history-assistant',
                role: 'assistant',
                content: '先選您想改善的健康方向。',
                reply_actions: {
                  schema_version: '0.1',
                  source: 'engine',
                  adaptor: 'fake',
                  degraded: false,
                  error: null,
                  actions: [{
                    type: 'choose_option',
                    payload: {
                      gap_code: null,
                      answer_type: 'multi',
                      kind: 'consultation_goals',
                      options: [
                        { code: 'sleep', label: '睡眠' },
                        { code: 'weight_loss', label: '體重管理' }
                      ]
                    }
                  }]
                }
              }
            ]
          }
        })
      })
    })

    await page.setViewportSize({ width: 1280, height: 800 })
    await page.addInitScript((journey) => {
      localStorage.setItem('candor.unpaid.journey', JSON.stringify(journey))
    }, {
      conversationId,
      conversationPath: 'C',
      messages: [
        {
          id: 'greet-e2e',
          role: 'assistant',
          parts: [{ type: 'text', text: `${FLOW_V2_GREETING_CONSULT}\n\n想先從哪裡開始？` }]
        },
        {
          id: 'local-path-c',
          role: 'user',
          parts: [{ type: 'text', text: pathCLabel }]
        },
        {
          id: 'local-upload',
          role: 'user',
          parts: [{ type: 'text', text: uploadedLabel }]
        },
        {
          id: 'stale-local-asst',
          role: 'assistant',
          parts: [{ type: 'text', text: '本機舊開場應被蓋掉' }]
        }
      ],
      hasAnalysis: false,
      selectedPackageCode: null,
      reportId: null,
      reportDockOpen: false,
      reportDockCollapsed: true,
      reportInterpretSent: false,
      selectedPackage: null,
      packageConfirmed: false,
      goalSelectActive: false,
      reportAskActive: false,
      goalOptions: [],
      selectedCodes: [],
      quizActive: false,
      activeQuestion: null,
      postQuizGuided: false,
      profileGaps: [],
      clarifyingGoals: [],
      expertReviewStatus: 'none'
    })
    await goto('/chat', { waitUntil: 'hydration' })

    const transcript = page.getByTestId('chat-transcript')
    await expect(transcript).toContainText(pathCLabel, { timeout: 15_000 })
    await expect(transcript).toContainText(uploadedLabel)
    await expect(transcript).toContainText('先選您想改善的健康方向')
    await expect(transcript).not.toContainText('本機舊開場應被蓋掉')
    await expect(page.getByTestId('chat-quiz-option-sleep')).toBeVisible({ timeout: 15_000 })

    // Each local-only user line appears once (no duplicate bubbles).
    expect((await transcript.getByText(pathCLabel, { exact: true }).count())).toBe(1)
    expect((await transcript.getByText(uploadedLabel, { exact: true }).count())).toBe(1)
  })

  test('path C：舊報告 attach flow_prompt 三鈕顯示', async ({ page, goto }) => {
    test.setTimeout(120_000)
    await mockCandorAuth(page, {
      asMember: true,
      conversationPath: null,
      basicProfileComplete: true,
      attachFlowPromptRa: 'lab_followup_stale',
      individualTestsUrl: 'https://example.test/checkup'
    })
    await seedNoExpertCase(page)
    await openFreshChat(page, goto)
    await selectEntryPath(page, 'C')

    await page.getByTestId('chat-message-upload').click()
    await page.setInputFiles('[data-testid="chat-upload-input"]', {
      name: 'report.pdf',
      mimeType: 'application/pdf',
      buffer: Buffer.from('%PDF-1.4 mock')
    })

    const last = page.getByTestId('chat-last-reply')
    await expect(last.getByTestId('chat-quiz-option-upload_new')).toHaveText('上傳新報告', {
      timeout: 30_000
    })
    await expect(last.getByTestId('chat-quiz-option-consult')).toHaveText('進行健康諮詢')
    await expect(last.getByTestId('chat-quiz-option-checkup')).toHaveText('進行血檢')
  })
})
