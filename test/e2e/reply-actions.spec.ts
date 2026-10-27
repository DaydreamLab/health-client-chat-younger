import type { Page } from '@playwright/test'
import { expect, test } from '@nuxt/test-utils/playwright'
import { mockCandorAuth } from './mock-candor-auth'

/** Default candor mock seeds a reviewed expert case; clear so /chat can show submit CTA. */
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
}

async function finishGoalSelect(page: Page) {
  await expect(page.getByTestId('chat-quiz-option-sleep')).toBeVisible({ timeout: 15_000 })
  await page.getByTestId('chat-quiz-option-sleep').click()
  await page.getByTestId('chat-quiz-confirm').click()
  // Goals saved → stream (or next bank question). Wait for goal confirm to settle.
  await expect(page.getByTestId('chat-quiz-confirm')).toHaveCount(0, { timeout: 15_000 })
}

async function sendChatLine(page: Page, text: string) {
  const input = page.getByTestId('chat-input')
  await expect(input).toBeVisible({ timeout: 15_000 })
  await input.fill(text)
  await page.getByTestId('chat-send').click()
}

test.describe('reply_actions v0.1 CTAs', () => {
  test('/chat: offer_recommend → 提交專家判讀; legacy chips/upload deduped', async ({ page, goto }) => {
    test.setTimeout(90_000)
    await mockCandorAuth(page, { asMember: true, replyActions: 'offer_recommend' })
    await seedNoExpertCase(page)
    await page.setViewportSize({ width: 1280, height: 800 })
    await goto('/chat', { waitUntil: 'hydration' })
    await page.evaluate(() => localStorage.removeItem('candor.unpaid.journey'))

    await finishGoalSelect(page)
    await sendChatLine(page, '請依報告給建議')

    const last = page.getByTestId('chat-last-reply')
    await expect(last.getByTestId('chat-submit-expert-review')).toBeVisible({ timeout: 15_000 })
    await expect(last.getByTestId('chat-submit-expert-review')).toHaveText('提交專家判讀')
    await expect(last.getByTestId('chat-view-recommend')).toHaveCount(0)
    // Usable reply_actions: ask_report → upload; legacy options chip must not appear.
    await expect(last.getByTestId('chat-message-upload')).toBeVisible()
    await expect(last.getByTestId('chat-quiz-option-legacy_chip')).toHaveCount(0)
    await expect(last.getByTestId('chat-message-checkup')).toHaveCount(0)
  })

  test('/chat-ai: same offer_recommend → 查看推薦方案', async ({ page, goto }) => {
    test.setTimeout(90_000)
    await mockCandorAuth(page, { asMember: true, replyActions: 'offer_recommend' })
    await page.setViewportSize({ width: 1280, height: 800 })
    await goto('/chat-ai', { waitUntil: 'hydration' })
    await page.evaluate(() => localStorage.removeItem('candor.unpaid.journey'))

    await finishGoalSelect(page)
    await sendChatLine(page, '請依報告給建議')

    const last = page.getByTestId('chat-last-reply')
    await expect(last.getByTestId('chat-view-recommend')).toBeVisible({ timeout: 15_000 })
    await expect(last.getByTestId('chat-view-recommend')).toHaveText('查看推薦方案')
    await expect(last.getByTestId('chat-submit-expert-review')).toHaveCount(0)
  })

  test('history hydrate: reload maps reply_actions CTAs; degraded falls back to legacy', async ({ page, goto }) => {
    test.setTimeout(90_000)
    await mockCandorAuth(page, { asMember: true, replyActions: 'offer_recommend' })
    await seedNoExpertCase(page)
    await page.setViewportSize({ width: 1280, height: 800 })

    const staleJourney = {
      conversationId: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
      messages: [
        {
          id: 'stale-user',
          role: 'user',
          parts: [{ type: 'text', text: '舊本機訊息' }]
        },
        {
          id: 'stale-assistant',
          role: 'assistant',
          parts: [{ type: 'text', text: '本機沒有 reply_actions' }],
          uploadOffer: true,
          checkupOffer: true,
          options: [{ code: 'legacy_chip', label: '舊選項' }]
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
      goalOptions: [],
      selectedCodes: [],
      quizActive: false,
      activeQuestion: null,
      postQuizGuided: false,
      profileGaps: [],
      clarifyingGoals: [],
      expertReviewStatus: 'none'
    }

    // Seed before first paint so Pinia hydrate reads the restored journey (not live persist).
    await page.addInitScript((journey) => {
      localStorage.setItem('candor.unpaid.journey', JSON.stringify(journey))
    }, staleJourney)
    await goto('/chat', { waitUntil: 'hydration' })

    const last = page.getByTestId('chat-last-reply')
    await expect(last).toContainText('依報告來看', { timeout: 15_000 })
    await expect(last.getByTestId('chat-submit-expert-review')).toBeVisible({ timeout: 15_000 })
    await expect(last.getByTestId('chat-message-upload')).toBeVisible()
    await expect(last.getByTestId('chat-quiz-option-legacy_chip')).toHaveCount(0)
    await expect(page.getByText('本機沒有 reply_actions')).toHaveCount(0)

    // Degraded history → legacy upload only.
    await mockCandorAuth(page, { asMember: true, replyActions: 'degraded' })
    await seedNoExpertCase(page)
    await page.addInitScript((journey) => {
      localStorage.setItem('candor.unpaid.journey', JSON.stringify(journey))
    }, {
      ...staleJourney,
      messages: [{
        id: 'stale',
        role: 'assistant',
        parts: [{ type: 'text', text: 'stale' }]
      }]
    })
    await goto('/chat', { waitUntil: 'hydration' })
    // Degraded reply_actions → not usable → legacy upload_offer paints upload.
    await expect(page.getByTestId('chat-last-reply').getByTestId('chat-message-upload')).toBeVisible({
      timeout: 15_000
    })
    await expect(page.getByTestId('chat-vitals-card')).toHaveCount(0)
    // Legacy recommend slot may still appear via journey gates (not from reply_actions).
  })

  test('ask_vitals renders numeric card; degraded falls back to legacy upload', async ({ page, goto }) => {
    test.setTimeout(90_000)
    await mockCandorAuth(page, { asMember: true, replyActions: 'ask_vitals' })
    await page.setViewportSize({ width: 1280, height: 800 })
    await goto('/chat', { waitUntil: 'hydration' })
    await page.evaluate(() => localStorage.removeItem('candor.unpaid.journey'))

    await finishGoalSelect(page)
    await sendChatLine(page, '我想補充基本資料')
    const last = page.getByTestId('chat-last-reply')
    await expect(last.getByTestId('chat-vitals-card')).toBeVisible({ timeout: 15_000 })
    await expect(last.getByTestId('chat-vitals-age')).toBeVisible()
    await expect(last.getByTestId('chat-quiz-option-legacy_chip')).toHaveCount(0)

    // Degraded path: remount with degraded mock and assert legacy upload.
    await mockCandorAuth(page, { asMember: true, replyActions: 'degraded' })
    await goto('/chat', { waitUntil: 'hydration' })
    await page.evaluate(() => {
      localStorage.removeItem('candor.unpaid.journey')
    })
    // Hard reset in-app journey via「重新開始」if present.
    const reset = page.getByTestId('chat-reset')
    if (await reset.count()) {
      page.once('dialog', dialog => dialog.accept())
      await reset.click()
    }
    await finishGoalSelect(page)
    await sendChatLine(page, '再試一次')
    await expect(page.getByTestId('chat-last-reply').getByTestId('chat-message-upload')).toBeVisible({
      timeout: 15_000
    })
    await expect(page.getByTestId('chat-vitals-card')).toHaveCount(0)
  })
})
