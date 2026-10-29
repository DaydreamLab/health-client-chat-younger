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
  // Chat mounts sync GET /conversation/{id}/expert-review once (no list poll).
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

async function finishGoalSelect(page: Page) {
  const entryB = page.getByTestId('chat-quiz-option-B')
  if (await entryB.isVisible().catch(() => false)) {
    await entryB.click()
  }
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

/** Selected age must sit in the highlight and paint above it (light and dark). */
async function expectAgePickerCenterVisible(page: Page, mode: 'light' | 'dark') {
  await expect.poll(async () => page.evaluate((theme) => {
    const picker = document.querySelector('[data-testid="chat-vitals-age-picker"]')
    const selected = picker?.querySelector('[aria-selected="true"]') as HTMLElement | null
    const band = picker?.querySelector('.ask-vitals-picker-sel') as HTMLElement | null
    const list = picker?.querySelector('.ask-vitals-picker-list') as HTMLElement | null
    const fade = picker?.querySelector('.ask-vitals-picker-fade') as HTMLElement | null
    if (!picker || !selected || !band || !list || !fade) {
      return 'missing'
    }
    const item = selected.getBoundingClientRect()
    const highlight = band.getBoundingClientRect()
    const aligned = Math.abs((item.top + item.height / 2) - (highlight.top + highlight.height / 2)) < 3
    const listZ = Number(getComputedStyle(list).zIndex)
    const bandZ = Number(getComputedStyle(band).zIndex)
    const fadeZ = Number(getComputedStyle(fade).zIndex)
    const stacked = listZ > bandZ && fadeZ > listZ
    const parsed = (value: string) => {
      const rgb = value.match(/rgba?\(([^)]+)\)/)
      if (rgb?.[1]) {
        const nums = rgb[1].split(/[\s,/]+/).map(Number).filter(n => !Number.isNaN(n))
        return { kind: 'rgb' as const, values: nums.slice(0, 3) }
      }
      const lab = value.match(/oklab\(([^)]+)\)/)
      if (lab?.[1]) {
        const nums = lab[1].trim().split(/[\s,/]+/).map(Number).filter(n => !Number.isNaN(n))
        return { kind: 'oklab' as const, values: nums.slice(0, 3) }
      }
      return null
    }
    const text = parsed(getComputedStyle(selected).color)
    const fill = parsed(getComputedStyle(band).backgroundColor)
    const textOk = theme === 'dark'
      ? text?.kind === 'rgb' && Math.min(...text.values) > 200
      : text?.kind === 'rgb' && Math.max(...text.values) < 180
    const fillOk = theme === 'dark'
      ? (fill?.kind === 'rgb' && Math.max(...fill.values) < 140)
      || (fill?.kind === 'oklab' && (fill.values[0] ?? 1) < 0.5)
      : (fill?.kind === 'rgb' && Math.min(...fill.values) > 200)
        || (fill?.kind === 'oklab' && (fill.values[0] ?? 0) > 0.85)
    return aligned && stacked && textOk && fillOk && (selected.textContent?.trim() ?? '')
      ? 'ok'
      : `aligned=${aligned} stacked=${stacked} text=${getComputedStyle(selected).color} fill=${getComputedStyle(band).backgroundColor}`
  }, mode), { timeout: 5_000 }).toBe('ok')
}

test.describe('reply_actions v0.1 CTAs', () => {
  test('/chat: offer_recommend → 完成 CTA 取得專屬保健品方案; legacy chips 不畫', async ({ page, goto }) => {
    test.setTimeout(90_000)
    // Inject conflicting checkup_offer only here — mock default no longer dual-writes it.
    await mockCandorAuth(page, {
      asMember: true,
      replyActions: 'offer_recommend',
      legacyCheckupOfferConflict: true
    })
    await seedNoExpertCase(page)
    await page.setViewportSize({ width: 1280, height: 800 })
    await goto('/chat', { waitUntil: 'hydration' })
    await page.evaluate(() => localStorage.removeItem('candor.unpaid.journey'))

    await finishGoalSelect(page)
    await sendChatLine(page, '請依報告給建議')

    const last = page.getByTestId('chat-last-reply')
    // 完成 CTA：usable offer_recommend → FE 投影取得專屬保健品方案（非 legacy 硬掛）
    await expect(last.getByTestId('chat-submit-expert-review')).toBeVisible({ timeout: 15_000 })
    await expect(last.getByTestId('chat-submit-expert-review')).toHaveText('取得專屬保健品方案')
    await expect(last.getByTestId('chat-submit-expert-review-hint')).toBeVisible()
    await expect(last.getByTestId('chat-submit-expert-review-hint')).toHaveText(
      '以上為 AI 對話資訊，專人將於 24 小時內為您處理'
    )
    await expect(last.getByTestId('chat-view-recommend')).toHaveCount(0)
    await expect(last.getByTestId('chat-message-upload')).toHaveCount(0)
    await expect(last.getByTestId('chat-quiz-option-legacy_chip')).toHaveCount(0)
    await expect(last.getByTestId('chat-message-checkup')).toHaveCount(0)
  })

  test('/chat: ask_report → 上傳必問; 不硬掛取得專屬保健品方案', async ({ page, goto }) => {
    test.setTimeout(90_000)
    await mockCandorAuth(page, { asMember: true, replyActions: 'ask_report' })
    await seedNoExpertCase(page)
    await page.setViewportSize({ width: 1280, height: 800 })
    await goto('/chat', { waitUntil: 'hydration' })
    await page.evaluate(() => localStorage.removeItem('candor.unpaid.journey'))

    await finishGoalSelect(page)
    await sendChatLine(page, '我想上傳報告')

    const last = page.getByTestId('chat-last-reply')
    await expect(last.getByTestId('chat-message-upload')).toBeVisible({ timeout: 15_000 })
    await expect(last.getByTestId('chat-submit-expert-review')).toHaveCount(0)
    await expect(last.getByTestId('chat-quiz-option-legacy_chip')).toHaveCount(0)
    // 僅 ask_report（無 offer_checkup）不算檢查建議 CTA 組 → 不掛繼續諮詢
    await expect(last.getByTestId('chat-continue-consult')).toHaveCount(0)
  })

  test('/chat: lab_followup chips → 繼續諮詢；點擊走 stream', async ({ page, goto }) => {
    test.setTimeout(90_000)
    await mockCandorAuth(page, { asMember: true, replyActions: 'lab_followup' })
    await seedNoExpertCase(page)
    await page.setViewportSize({ width: 1280, height: 800 })
    await goto('/chat', { waitUntil: 'hydration' })
    await page.evaluate(() => localStorage.removeItem('candor.unpaid.journey'))

    await finishGoalSelect(page)
    await sendChatLine(page, '沒有報告')

    const last = page.getByTestId('chat-last-reply')
    await expect(last.getByTestId('chat-quiz-option-upload')).toBeVisible({ timeout: 15_000 })
    await expect(last.getByTestId('chat-quiz-option-checkup')).toBeVisible()
    await expect(last.getByTestId('chat-continue-consult')).toBeVisible()
    await expect(last.getByTestId('chat-continue-consult')).toHaveText('繼續諮詢')
    await expect(last.getByTestId('chat-continue-consult')).toHaveCount(1)

    const streamReq = page.waitForRequest(req =>
      req.method() === 'POST'
      && req.url().includes('/messages/stream')
      && (req.postData() || '').includes('繼續諮詢')
    )
    await last.getByTestId('chat-continue-consult').click()
    await streamReq
  })

  test('/chat: ask_report + offer_checkup → 繼續諮詢；不重複', async ({ page, goto }) => {
    test.setTimeout(90_000)
    await mockCandorAuth(page, {
      asMember: true,
      replyActions: 'ask_report_checkup',
      individualTestsUrl: 'https://example.test/checkup'
    })
    await seedNoExpertCase(page)
    await page.setViewportSize({ width: 1280, height: 800 })
    await goto('/chat', { waitUntil: 'hydration' })
    await page.evaluate(() => localStorage.removeItem('candor.unpaid.journey'))

    await finishGoalSelect(page)
    await sendChatLine(page, '沒有報告')

    const last = page.getByTestId('chat-last-reply')
    await expect(last.getByTestId('chat-message-upload')).toBeVisible({ timeout: 15_000 })
    await expect(last.getByTestId('chat-message-checkup')).toBeVisible()
    await expect(last.getByTestId('chat-continue-consult')).toBeVisible()
    await expect(last.getByTestId('chat-continue-consult')).toHaveText('繼續諮詢')
    await expect(last.getByTestId('chat-continue-consult')).toHaveCount(1)
  })

  test('/chat: intentional none → 不畫怪鈕（無 legacy 取得專屬保健品方案）', async ({ page, goto }) => {
    test.setTimeout(90_000)
    await mockCandorAuth(page, { asMember: true, replyActions: 'none' })
    await seedNoExpertCase(page)
    await page.setViewportSize({ width: 1280, height: 800 })
    await goto('/chat', { waitUntil: 'hydration' })
    await page.evaluate(() => localStorage.removeItem('candor.unpaid.journey'))

    await finishGoalSelect(page)
    await sendChatLine(page, '聊聊生活習慣')

    const last = page.getByTestId('chat-last-reply')
    await expect(last).toBeVisible({ timeout: 15_000 })
    await expect(last.getByTestId('chat-submit-expert-review')).toHaveCount(0)
    await expect(last.getByTestId('chat-message-upload')).toHaveCount(0)
    await expect(last.getByTestId('chat-message-checkup')).toHaveCount(0)
    await expect(last.getByTestId('chat-quiz-option-legacy_chip')).toHaveCount(0)
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

  test('history hydrate: reload maps reply_actions CTAs; degraded 不回退 legacy', async ({ page, goto }) => {
    test.setTimeout(90_000)
    await mockCandorAuth(page, {
      asMember: true,
      replyActions: 'offer_recommend',
      legacyCheckupOfferConflict: true
    })
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
      reportAskActive: false,
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
    await expect(last.getByTestId('chat-submit-expert-review-hint')).toBeVisible()
    await expect(last.getByTestId('chat-message-upload')).toHaveCount(0)
    await expect(last.getByTestId('chat-quiz-option-legacy_chip')).toHaveCount(0)
    await expect(last.getByTestId('chat-message-checkup')).toHaveCount(0)
    await expect(page.getByText('本機沒有 reply_actions')).toHaveCount(0)

    // Degraded RA → not usable: no legacy upload／recommend／checkup／want-more.

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
    const degradedLast = page.getByTestId('chat-last-reply')
    await expect(degradedLast).toBeVisible({ timeout: 15_000 })
    await expect(degradedLast.getByTestId('chat-message-upload')).toHaveCount(0)
    await expect(degradedLast.getByTestId('chat-submit-expert-review')).toHaveCount(0)
    await expect(degradedLast.getByTestId('chat-submit-expert-review-hint')).toHaveCount(0)
    await expect(degradedLast.getByTestId('chat-message-checkup')).toHaveCount(0)
    await expect(degradedLast.getByTestId('chat-message-want-more-tests')).toHaveCount(0)
    await expect(page.getByTestId('chat-vitals-card')).toHaveCount(0)
  })

  test('ask_vitals age picker → int profile/answers; then height numpad sequential', async ({ page, goto }) => {
    test.setTimeout(90_000)
    await mockCandorAuth(page, { asMember: true, replyActions: 'ask_vitals' })
    await page.setViewportSize({ width: 1280, height: 800 })
    await goto('/chat', { waitUntil: 'hydration' })
    await page.evaluate(() => localStorage.removeItem('candor.unpaid.journey'))

    await finishGoalSelect(page)
    await sendChatLine(page, '我想補充基本資料')
    const last = page.getByTestId('chat-last-reply')
    await expect(last.getByTestId('chat-vitals-card')).toBeVisible({ timeout: 15_000 })
    await expect(last.getByTestId('chat-vitals-age-picker')).toBeVisible()
    await expect(last.getByTestId('chat-vitals-age')).toBeVisible()
    await expect(last.getByTestId('chat-quiz-option-legacy_chip')).toHaveCount(0)
    // First wave: only one field card — height numpad not yet.
    await expect(last.getByTestId('chat-vitals-numpad')).toHaveCount(0)
    await expectAgePickerCenterVisible(page, 'light')
    await page.evaluate(() => document.documentElement.classList.add('dark'))
    await expectAgePickerCenterVisible(page, 'dark')
    await page.evaluate(() => document.documentElement.classList.remove('dark'))

    await last.getByTestId('chat-vitals-age-option-35').click()
    const agePost = page.waitForRequest(req =>
      req.url().includes('/api/v1/profile/answers') && req.method() === 'POST'
    )
    await last.getByTestId('chat-vitals-confirm').click()
    const ageReq = await agePost
    expect(ageReq.postDataJSON()).toMatchObject({ gap_code: 'age', value: 35 })

    // Sequential: height numpad after age saved.
    await expect(last.getByTestId('chat-vitals-numpad')).toBeVisible({ timeout: 15_000 })
    await expect(last.getByTestId('chat-vitals-key-dot')).toBeDisabled()
    await last.getByTestId('chat-vitals-key-1').click()
    await last.getByTestId('chat-vitals-key-7').click()
    await last.getByTestId('chat-vitals-key-5').click()
    await expect(last.getByTestId('chat-vitals-height')).toHaveText('175')

    const heightPost = page.waitForRequest(req =>
      req.url().includes('/api/v1/profile/answers') && req.method() === 'POST'
    )
    await last.getByTestId('chat-vitals-confirm').click()
    const heightReq = await heightPost
    expect(heightReq.postDataJSON()).toMatchObject({ gap_code: 'height', value: 175 })

    // Weight card next.
    await expect(last.getByTestId('chat-vitals-weight')).toBeVisible({ timeout: 15_000 })
  })

  test('degraded stream paints no legacy upload / recommend', async ({ page, goto }) => {
    test.setTimeout(90_000)
    await mockCandorAuth(page, { asMember: true, replyActions: 'degraded' })
    await seedNoExpertCase(page)
    await page.setViewportSize({ width: 1280, height: 800 })
    await goto('/chat', { waitUntil: 'hydration' })
    await page.evaluate(() => localStorage.removeItem('candor.unpaid.journey'))

    await finishGoalSelect(page)
    await sendChatLine(page, '再試一次')
    const last = page.getByTestId('chat-last-reply')
    await expect(last).toBeVisible({ timeout: 15_000 })
    await expect(last.getByTestId('chat-message-upload')).toHaveCount(0)
    await expect(last.getByTestId('chat-submit-expert-review')).toHaveCount(0)
    await expect(page.getByTestId('chat-vitals-card')).toHaveCount(0)
  })

  test('lab_report choose_option: chip click POSTs answers (no confirm)', async ({ page, goto }) => {
    // Regression (#24 dual-path): reply_actions hides confirm for profile enum, but
    // ChatPanel used to only highlight LAB_GAP_CODES until confirm — stuck UX.
    test.setTimeout(90_000)
    const conversationId = 'cccccccc-cccc-cccc-cccc-cccccccccccc'
    await mockCandorAuth(page, { asMember: true, replyActions: 'offer_recommend' })
    await page.setViewportSize({ width: 1280, height: 800 })

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
            messages: [
              { id: 'u-lab', role: 'user', content: '我想上傳報告' },
              {
                id: 'bank-lab',
                role: 'assistant',
                content: '是否有血檢或健檢報告？',
                reply_actions: {
                  schema_version: '0.1',
                  source: 'questionnaire',
                  adaptor: 'fake',
                  degraded: false,
                  error: null,
                  actions: [
                    {
                      type: 'choose_option',
                      payload: {
                        kind: 'profile',
                        mode: 'single',
                        confirm: false,
                        gap_code: 'lab_report',
                        answer_type: 'enum',
                        options: [
                          { code: 'none', label: '沒有' },
                          { code: 'over_3y', label: '有：超過三年' },
                          { code: '1_to_3y', label: '有：一到三年' },
                          { code: 'within_1y', label: '有：一年內' },
                          { code: 'within_6m', label: '有：半年內' }
                        ]
                      }
                    }
                  ]
                }
              }
            ]
          }
        })
      })
    })

    await page.addInitScript((journey) => {
      localStorage.setItem('candor.unpaid.journey', JSON.stringify(journey))
    }, {
      conversationId,
      messages: [{
        id: 'stale',
        role: 'assistant',
        parts: [{ type: 'text', text: 'stale' }]
      }],
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
      profileGaps: ['lab_report'],
      clarifyingGoals: [],
      expertReviewStatus: 'none'
    })

    await goto('/chat', { waitUntil: 'hydration' })

    const last = page.getByTestId('chat-last-reply')
    await expect(last).toContainText('是否有血檢或健檢報告？', { timeout: 15_000 })
    await expect(last.getByTestId('chat-quiz-option-within_6m')).toBeVisible()
    await expect(page.getByTestId('chat-quiz-confirm')).toHaveCount(0)

    const labPost = page.waitForRequest(req =>
      req.url().includes('/api/v1/profile/answers') && req.method() === 'POST'
    )
    await last.getByTestId('chat-quiz-option-within_6m').click()
    const labReq = await labPost
    expect(labReq.postDataJSON()).toMatchObject({
      gap_code: 'lab_report',
      value: 'within_6m'
    })
  })

  test('lab_report=none: next_question.done + hydrate 舊 choose_option 仍必須 stream', async ({
    page,
    goto
  }) => {
    // P0 regression: continueAfterSavedAnswer used to skip stream because hydrate
    // still carried answered choose_option(lab_report) → hasUsableGapCta true.
    test.setTimeout(90_000)
    // Must match mockCandorAuth conversationId so /messages/stream is mocked.
    const conversationId = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
    await mockCandorAuth(page, { asMember: true, replyActions: 'offer_recommend' })
    await page.setViewportSize({ width: 1280, height: 800 })

    // Align with core #99: lab present must not hard-attach offer_checkup on the same turn.
    const labBank = {
      id: 'bank-lab-none',
      role: 'assistant',
      content: '是否有血檢或健檢報告？',
      reply_actions: {
        schema_version: '0.1',
        source: 'questionnaire',
        adaptor: 'fake',
        degraded: false,
        error: null,
        actions: [
          {
            type: 'choose_option',
            payload: {
              kind: 'profile',
              mode: 'single',
              confirm: false,
              gap_code: 'lab_report',
              answer_type: 'enum',
              options: [
                { code: 'none', label: '無' },
                { code: 'within_6m', label: '有：半年內' }
              ]
            }
          }
        ]
      }
    }

    await page.route(`**/api/v1/conversation/${conversationId}/messages`, async (route) => {
      if (route.request().method() !== 'GET') {
        await route.fallback()
        return
      }
      if (route.request().url().includes('/messages/stream')) {
        await route.fallback()
        return
      }
      // Live shape: answering lab does not rewrite bank RA — still has choose_option.
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          status: 'success',
          data: {
            conversation_id: conversationId,
            messages: [
              { id: 'u-lab-none', role: 'user', content: '開始' },
              labBank
            ]
          }
        })
      })
    })

    await page.route('**/api/v1/profile/answers', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          status: 'success',
          data: {
            saved: true,
            profile_gaps: [],
            next_question: { done: true, plan_offer: true }
          }
        })
      })
    })

    await page.addInitScript((journey) => {
      localStorage.setItem('candor.unpaid.journey', JSON.stringify(journey))
    }, {
      conversationId,
      messages: [{
        id: 'stale',
        role: 'assistant',
        parts: [{ type: 'text', text: 'stale' }]
      }],
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
      profileGaps: ['lab_report'],
      clarifyingGoals: [],
      expertReviewStatus: 'none'
    })

    await goto('/chat', { waitUntil: 'hydration' })

    const last = page.getByTestId('chat-last-reply')
    await expect(last).toContainText('是否有血檢或健檢報告？', { timeout: 15_000 })
    // Before answering「無」: no checkup bubble on the lab prompt turn (#99).
    await expect(last.getByTestId('chat-message-checkup')).toHaveCount(0)
    const streamReq = page.waitForRequest(req =>
      req.url().includes('/messages/stream') && req.method() === 'POST'
    )
    await last.getByTestId('chat-quiz-option-none').click()
    await streamReq
    await expect(page.getByTestId('chat-last-reply')).toContainText('基礎保養', { timeout: 15_000 })
  })

  test('gap CTA fallback: hydrate keeps ask_vitals on bank when latest is offer_recommend-only', async ({
    page,
    goto
  }) => {
    test.setTimeout(90_000)
    const conversationId = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'
    await mockCandorAuth(page, { asMember: true, replyActions: 'offer_recommend' })
    await seedNoExpertCase(page)
    await page.setViewportSize({ width: 1280, height: 800 })

    // Override history: bank ask_vitals, then covering stream turn with only offer_recommend.
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
            messages: [
              { id: 'u1', role: 'user', content: '30' },
              {
                id: 'bank-height',
                role: 'assistant',
                content: '請問您的身高（公分）？',
                reply_actions: {
                  schema_version: '0.1',
                  source: 'questionnaire',
                  adaptor: 'fake',
                  degraded: false,
                  error: null,
                  actions: [
                    {
                      type: 'ask_vitals',
                      payload: { fields: ['height'], gap_code: 'height' }
                    }
                  ]
                }
              },
              {
                id: 'stream-cover',
                role: 'assistant',
                content: '請問您的身高是多少公分呢？',
                reply_actions: {
                  schema_version: '0.1',
                  source: 'semantic_judgment',
                  adaptor: 'fake',
                  degraded: false,
                  error: null,
                  actions: [{ type: 'offer_recommend', payload: {} }]
                }
              }
            ]
          }
        })
      })
    })

    await page.addInitScript((journey) => {
      localStorage.setItem('candor.unpaid.journey', JSON.stringify(journey))
    }, {
      conversationId,
      messages: [{
        id: 'stale',
        role: 'assistant',
        parts: [{ type: 'text', text: 'stale' }]
      }],
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
      profileGaps: ['height'],
      clarifyingGoals: [],
      expertReviewStatus: 'none'
    })

    await goto('/chat', { waitUntil: 'hydration' })

    // Latest bubble is the covering stream text; numpad must still render via gap fallback.
    const last = page.getByTestId('chat-last-reply')
    await expect(last).toContainText('身高是多少公分', { timeout: 15_000 })
    await expect(page.getByTestId('chat-vitals-card')).toBeVisible({ timeout: 15_000 })
    await expect(page.getByTestId('chat-vitals-numpad')).toBeVisible()
    await expect(page.getByTestId('chat-vitals-height')).toBeVisible()
    // Covering offer_recommend must not paint recommend while gap is open.
    await expect(page.getByTestId('chat-submit-expert-review')).toHaveCount(0)
  })
})
