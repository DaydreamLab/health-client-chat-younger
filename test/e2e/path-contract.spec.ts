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
  await goto('/chat', { waitUntil: 'hydration' })
  await page.evaluate(() => localStorage.removeItem('candor.unpaid.journey'))
  await goto('/chat', { waitUntil: 'hydration' })
  await expect(page.getByTestId('chat-transcript')).toBeVisible({ timeout: 20_000 })
}

/** Path is create-time: pick 進站三選 before goals／chat. */
async function selectEntryPath(page: Page, path: 'A' | 'B' | 'C') {
  await expect(page.getByTestId(`chat-quiz-option-${path}`)).toBeVisible({ timeout: 15_000 })
  await page.getByTestId(`chat-quiz-option-${path}`).click()
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

    await expect(page.getByTestId('chat-quiz-option-A')).toBeVisible({ timeout: 15_000 })
    await expect(page.getByTestId('chat-quiz-option-B')).toBeVisible()
    await expect(page.getByTestId('chat-quiz-option-C')).toBeVisible()
    await expect(page.getByTestId('chat-quiz-option-A')).toHaveText('我想聊聊')
    await expect(page.getByTestId('chat-quiz-option-B')).toHaveText('我想諮詢健康方案')
    await expect(page.getByTestId('chat-quiz-option-C')).toHaveText('幫我看報告')
    await expect(page.getByTestId('chat-submit-expert-review')).toHaveCount(0)
  })

  const removedLocalOpeners = [
    '好的，我們先聊聊',
    '好的，我們來了解你的基本狀況',
    '好的，請上傳近期健檢',
    '你好，想聊什麼都可以',
    '請先上傳血檢或健檢報告；若不傳可改為諮詢健康方案'
  ]

  test('path A：選項當一般訊息送出；greeting 在選項下方', async ({ page, goto }) => {
    test.setTimeout(90_000)
    await mockCandorAuth(page, {
      asMember: true,
      conversationPath: null,
      basicProfileComplete: true
    })
    await seedNoExpertCase(page)
    await openFreshChat(page, goto)
    await selectEntryPath(page, 'A')

    const transcript = page.getByTestId('chat-transcript')
    await expect(transcript).toContainText('我想聊聊', { timeout: 15_000 })
    await expect(transcript).toContainText(FLOW_V2_GREETING_CONSULT, { timeout: 15_000 })
    const text = await transcript.innerText()
    expect(text.indexOf('我想聊聊')).toBeLessThan(text.indexOf(FLOW_V2_GREETING_CONSULT))
    for (const opener of removedLocalOpeners) {
      await expect(transcript).not.toContainText(opener)
    }
    // A：不走 goals；create 也不回 goals chips。
    await expect(page.getByTestId('chat-quiz-option-sleep')).toHaveCount(0)
  })

  test('path B：選項當一般訊息送出 → stream 回 goals；greeting 在選項下方', async ({ page, goto }) => {
    test.setTimeout(90_000)
    await mockCandorAuth(page, {
      asMember: true,
      conversationPath: null,
      basicProfileComplete: false
    })
    await seedNoExpertCase(page)
    await openFreshChat(page, goto)
    await selectEntryPath(page, 'B')

    const transcript = page.getByTestId('chat-transcript')
    await expect(transcript).toContainText('我想諮詢健康方案', { timeout: 15_000 })
    await expect(transcript).toContainText(FLOW_V2_GREETING_CONSULT, { timeout: 15_000 })
    const text = await transcript.innerText()
    expect(text.indexOf('我想諮詢健康方案')).toBeLessThan(text.indexOf(FLOW_V2_GREETING_CONSULT))
    for (const opener of removedLocalOpeners) {
      await expect(transcript).not.toContainText(opener)
    }
    // Goals come from the entry stream reply（not create／not GET next）.
    await expect(page.getByTestId('chat-quiz-option-sleep')).toBeVisible({ timeout: 15_000 })
  })

  test('path C：選完只留 greeting.consult，無路徑專屬本地句', async ({ page, goto }) => {
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
    for (const opener of removedLocalOpeners) {
      await expect(transcript).not.toContainText(opener)
    }
  })

  test('path A：core stripOfferRecommend → 無完成 CTA（FE 不依 path 再藏）', async ({ page, goto }) => {
    test.setTimeout(90_000)
    // Mock mirrors core: path A stream omits offer_recommend even if mode asks for it.
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
    await expect(last.getByTestId('chat-submit-expert-review')).toHaveCount(0)
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
    await expect(page.getByTestId('chat-submit-expert-review')).toHaveCount(0)
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
    await page.setViewportSize({ width: 1280, height: 800 })
    await goto('/chat', { waitUntil: 'hydration' })
    await page.evaluate(() => localStorage.removeItem('candor.unpaid.journey'))
    await goto('/chat', { waitUntil: 'hydration' })
    await selectEntryPath(page, 'B')

    await finishGoalSelect(page)
    await sendChatLine(page, '請給方案')

    const last = page.getByTestId('chat-last-reply')
    await expect(last.getByTestId('chat-submit-expert-review')).toBeVisible({ timeout: 15_000 })
    await expect(last.getByTestId('chat-submit-expert-review')).toHaveText('取得專屬保健品方案')
    await expect(last.getByTestId('chat-submit-expert-review-hint')).toHaveText(
      '以上為 AI 對話資訊，專人將於 24 小時內為您處理'
    )
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
    await page.setViewportSize({ width: 1280, height: 800 })
    await goto('/chat', { waitUntil: 'hydration' })
    await page.evaluate(() => localStorage.removeItem('candor.unpaid.journey'))
    await goto('/chat', { waitUntil: 'hydration' })
    await selectEntryPath(page, 'B')

    await finishGoalSelect(page)
    await sendChatLine(page, '還有嗎')

    const last = page.getByTestId('chat-last-reply')
    await expect(last).toBeVisible({ timeout: 15_000 })
    await expect(last.getByTestId('chat-submit-expert-review')).toHaveCount(0)
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

  test('path C：自動送失敗時保留 flow_prompt 按鈕', async ({ page, goto }) => {
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
    await expect(last).toContainText(FLOW_V2_PATH_C_BASICS)
    await expect(last.getByTestId('chat-quiz-option-sleep')).toBeVisible({ timeout: 15_000 })
    await expect(last).not.toContainText('回覆暫時無法取得')
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
