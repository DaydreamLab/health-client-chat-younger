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
  // Entry chips: RA path_switch uses a／b／c；legacy PATH_ENTRY used A／B／C.
  const entryB = page.getByTestId('chat-quiz-option-b')
  const entryBLegacy = page.getByTestId('chat-quiz-option-B')
  if (await entryB.isVisible().catch(() => false)) {
    await entryB.click()
  } else if (await entryBLegacy.isVisible().catch(() => false)) {
    await entryBLegacy.click()
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
    await expect(last.getByTestId('chat-view-recommend')).toBeVisible({ timeout: 15_000 })
    await expect(last.getByTestId('chat-view-recommend')).toHaveText('查看推薦方案')
    await expect(last.getByTestId('chat-message-upload')).toHaveCount(0)
    await expect(last.getByTestId('chat-quiz-option-legacy_chip')).toHaveCount(0)
    await expect(last.getByTestId('chat-message-checkup')).toHaveCount(0)
  })

  test('/chat: offer_full_test → 建議文案＋外連鈕在完成 CTA 後面；target=_blank', async ({ page, goto }) => {
    test.setTimeout(90_000)
    await mockCandorAuth(page, {
      asMember: true,
      replyActions: 'offer_full_test'
    })
    await seedNoExpertCase(page)
    await page.setViewportSize({ width: 1280, height: 800 })
    await goto('/chat', { waitUntil: 'hydration' })
    await page.evaluate(() => localStorage.removeItem('candor.unpaid.journey'))

    await finishGoalSelect(page)
    await sendChatLine(page, '請依報告給建議')

    const last = page.getByTestId('chat-last-reply')
    const recommend = last.getByTestId('chat-view-recommend')
    const fullTest = last.getByTestId('chat-message-full-test')
    const hint = last.getByTestId('chat-message-full-test-hint')
    await expect(recommend).toBeVisible({ timeout: 15_000 })
    await expect(hint).toBeVisible()
    await expect(hint).toContainText('42')
    await expect(fullTest).toBeVisible()
    await expect(fullTest).toHaveText('了解完整 136 項檢測')
    await expect(fullTest).toHaveAttribute('href', 'https://www.younger.tw/products/body-decode')
    await expect(fullTest).toHaveAttribute('target', '_blank')
    await expect(fullTest).toHaveAttribute('rel', /noopener/)
    // 建議鈕排在完成鈕後面（DOM 順序）
    const order = await last.evaluate(() => {
      const actions = document.querySelector('[data-testid="chat-turn-actions"]')
      if (!actions) {
        return ''
      }
      const ids = [...actions.querySelectorAll('[data-testid]')]
        .map(el => el.getAttribute('data-testid') || '')
        .filter(id => id === 'chat-view-recommend' || id === 'chat-message-full-test')
      return ids.join(',')
    })
    expect(order).toBe('chat-view-recommend,chat-message-full-test')
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
    await expect(last.getByTestId('chat-view-recommend')).toHaveCount(0)
    await expect(last.getByTestId('chat-quiz-option-legacy_chip')).toHaveCount(0)
    // 僅 ask_report（無 offer_checkup）不算檢查建議 CTA 組 → 不掛繼續健康諮詢
    await expect(last.getByTestId('chat-continue-consult')).toHaveCount(0)
  })

  test('/chat: lab_followup chips → 繼續健康諮詢；點擊走 stream', async ({ page, goto }) => {
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
    await expect(last.getByTestId('chat-continue-consult')).toHaveText('繼續健康諮詢')
    await expect(last.getByTestId('chat-continue-consult')).toHaveCount(1)

    const streamReq = page.waitForRequest(req =>
      req.method() === 'POST'
      && req.url().includes('/messages/stream')
      && (req.postData() || '').includes('繼續健康諮詢')
    )
    await last.getByTestId('chat-continue-consult').click()
    await streamReq
  })

  test('/chat: ask_report + offer_checkup → 繼續健康諮詢；不重複', async ({ page, goto }) => {
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
    await expect(last.getByTestId('chat-continue-consult')).toHaveText('繼續健康諮詢')
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
    await expect(last.getByTestId('chat-view-recommend')).toHaveCount(0)
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
    // v4：完成 CTA 一律「查看推薦方案」，不再出現提交專家判讀／雙選。
    await expect(last.getByTestId('chat-submit-expert-review')).toHaveCount(0)
    await expect(page.locator('[data-testid^="chat-dual-choice-"]')).toHaveCount(0)
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
    await expect(last.getByTestId('chat-view-recommend')).toBeVisible({ timeout: 15_000 })
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
    await expect(degradedLast.getByTestId('chat-view-recommend')).toHaveCount(0)
    await expect(degradedLast.getByTestId('chat-message-checkup')).toHaveCount(0)
    await expect(degradedLast.getByTestId('chat-message-want-more-tests')).toHaveCount(0)
    await expect(page.getByTestId('chat-vitals-card')).toHaveCount(0)
  })

  test('ask_vitals age picker → int profile/answers; then height numpad sequential', async ({ page, goto }) => {
    test.setTimeout(90_000)
    await mockCandorAuth(page, { asMember: true, replyActions: 'ask_vitals' })
    await seedNoExpertCase(page)
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
    await expect(last.getByTestId('chat-view-recommend')).toHaveCount(0)
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
    // Also asserts candor-core #134: echo stream body { content, intent: "after_answer" }.
    test.setTimeout(90_000)
    // Must match mockCandorAuth conversationId so /messages/stream is mocked.
    const conversationId = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
    // Path A: avoid B／C first-stream goals short-circuit so lab answer streams offer_recommend.
    await mockCandorAuth(page, {
      asMember: true,
      replyActions: 'offer_recommend',
      conversationPath: 'A'
    })
    // Default mock seeds a reviewed expert case＋report; clear so hydrate stays on lab bank
    // (Path C attach would otherwise stream and detach the「無」chip).
    await seedNoExpertCase(page)
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
    const afterAnswerStream = await streamReq
    // Exact body shape per candor-core #134 (intent sibling of content).
    expect(afterAnswerStream.postDataJSON()).toEqual({
      content: '無',
      intent: 'after_answer'
    })
    await expect(page.getByTestId('chat-last-reply')).toContainText('基礎保養', { timeout: 15_000 })
  })

  test('typed composer stream omits after_answer intent', async ({ page, goto }) => {
    // Free-typed sendText → streamPending with pendingIntent left null (not after_answer).
    test.setTimeout(90_000)
    // Match mockCandorAuth default so /messages/stream is already mocked.
    const conversationId = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
    await mockCandorAuth(page, {
      asMember: true,
      replyActions: 'offer_recommend',
      conversationPath: 'A'
    })
    await seedNoExpertCase(page)
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
              { id: 'u-free', role: 'user', content: '開始' },
              {
                id: 'a-free',
                role: 'assistant',
                content: '好的，想聊什麼都可以。',
                reply_actions: {
                  schema_version: '0.1',
                  source: 'engine',
                  adaptor: 'fake',
                  degraded: false,
                  error: null,
                  actions: [{ type: 'none' }]
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
      profileGaps: [],
      clarifyingGoals: [],
      expertReviewStatus: 'none',
      conversationPath: 'A'
    })

    await goto('/chat', { waitUntil: 'hydration' })
    await expect(page.getByTestId('chat-last-reply')).toContainText('想聊什麼都可以', {
      timeout: 15_000
    })

    const typed = '我想了解維生素D'
    const streamReq = page.waitForRequest(req =>
      req.url().includes('/messages/stream')
      && req.method() === 'POST'
      && (req.postData() || '').includes(typed)
    )
    await sendChatLine(page, typed)
    // Free-typed: content only — no intent key (not after_answer).
    expect((await streamReq).postDataJSON()).toEqual({ content: typed })
  })

  test('solo path_switch empty label → chip shows i18n「我想諮詢健康方案」not code b', async ({
    page,
    goto
  }) => {
    test.setTimeout(90_000)
    const conversationId = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
    await mockCandorAuth(page, { asMember: true, conversationPath: 'A' })
    await seedNoExpertCase(page)
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
              { id: 'u-solo-switch', role: 'user', content: '繼續' },
              {
                id: 'a-solo-switch',
                role: 'assistant',
                content: '若想取得專屬保健品方案，可以繼續諮詢健康方案。',
                reply_actions: {
                  schema_version: '0.1',
                  source: 'rule',
                  adaptor: 'rule',
                  degraded: false,
                  error: null,
                  actions: [
                    { type: 'offer_checkup', payload: { url: 'https://example.test/checkup' } },
                    {
                      type: 'choose_option',
                      payload: {
                        kind: 'path_switch',
                        mode: 'single',
                        confirm: false,
                        options: [{ code: 'b', label: '' }],
                        selected: [],
                        gap_code: null,
                        answer_type: null,
                        exclusive_codes: []
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
      profileGaps: [],
      clarifyingGoals: [],
      expertReviewStatus: 'none',
      conversationPath: 'A'
    })

    await goto('/chat', { waitUntil: 'hydration' })
    const last = page.getByTestId('chat-last-reply')
    await expect(last).toContainText('專屬保健品方案', { timeout: 15_000 })
    await expect(last.getByTestId('chat-quiz-option-b')).toHaveText('我想諮詢健康方案')
    await expect(last.getByTestId('chat-quiz-option-b')).not.toHaveText('b')
  })

  test('no lift: latest offer_recommend-only shows completion CTA; bank ask_vitals stays hidden', async ({
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
                content: '已整理目前資訊，可查看推薦方案。',
                reply_actions: {
                  schema_version: '0.1',
                  source: 'semantic_judgment',
                  adaptor: 'fake',
                  degraded: false,
                  error: null,
                  actions: [{
                    type: 'offer_recommend',
                    payload: {
                      mode: 'view_recommendations',
                      label: '查看推薦方案',
                      path: '/app/recommendations'
                    }
                  }]
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

    const last = page.getByTestId('chat-last-reply')
    await expect(last).toContainText('查看推薦方案', { timeout: 15_000 })
    // Bank height numpad must NOT lift onto latest.
    await expect(page.getByTestId('chat-vitals-card')).toHaveCount(0)
    await expect(page.getByTestId('chat-vitals-numpad')).toHaveCount(0)
    // Latest own offer_recommend paints completion CTA even if older gap is open.
    await expect(page.getByTestId('chat-view-recommend')).toBeVisible({ timeout: 15_000 })
  })

  test('consecutive completion CTAs: each latest turn keeps view-recommend', async ({
    page,
    goto
  }) => {
    test.setTimeout(90_000)
    const conversationId = 'cccccccc-cccc-cccc-cccc-cccccccccccc'
    await mockCandorAuth(page, { asMember: true, replyActions: 'offer_recommend' })
    await seedNoExpertCase(page)
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
            path: 'b',
            messages: [
              { id: 'u1', role: 'user', content: '繼續' },
              {
                id: 'assist-1',
                role: 'assistant',
                content: '第一輪摘要',
                reply_actions: {
                  schema_version: '0.1',
                  source: 'semantic_judgment',
                  adaptor: 'rule',
                  degraded: false,
                  error: null,
                  actions: [{
                    type: 'offer_recommend',
                    payload: {
                      mode: 'view_recommendations',
                      label: '查看推薦方案',
                      path: '/app/recommendations'
                    }
                  }, {
                    type: 'choose_option',
                    payload: {
                      kind: 'continue_consultation',
                      mode: 'single',
                      options: [{ code: 'continue', label: '繼續健康諮詢' }]
                    }
                  }]
                }
              },
              { id: 'u2', role: 'user', content: '繼續健康諮詢' },
              {
                id: 'assist-2',
                role: 'assistant',
                content: '第二輪摘要',
                reply_actions: {
                  schema_version: '0.1',
                  source: 'semantic_judgment',
                  adaptor: 'rule',
                  degraded: false,
                  error: null,
                  actions: [{
                    type: 'offer_recommend',
                    payload: {
                      mode: 'view_recommendations',
                      label: '查看推薦方案',
                      path: '/app/recommendations'
                    }
                  }, {
                    type: 'choose_option',
                    payload: {
                      kind: 'open_question_reply',
                      mode: 'single',
                      options: [
                        { code: 'no_more', label: '我沒有問題了' },
                        { code: 'suggest', label: '你有什麼建議' }
                      ]
                    }
                  }, {
                    type: 'choose_option',
                    payload: {
                      kind: 'continue_consultation',
                      mode: 'single',
                      options: [{ code: 'continue', label: '繼續健康諮詢' }]
                    }
                  }]
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
      conversationPath: 'B',
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
      profileGaps: [],
      clarifyingGoals: [],
      expertReviewStatus: 'none'
    })

    await goto('/chat', { waitUntil: 'hydration' })

    const last = page.getByTestId('chat-last-reply')
    await expect(last).toContainText('第二輪摘要', { timeout: 15_000 })
    await expect(page.getByTestId('chat-view-recommend')).toBeVisible({ timeout: 15_000 })
    await expect(page.getByTestId('chat-quiz-option-no_more')).toBeVisible()
    await expect(page.getByTestId('chat-quiz-option-suggest')).toBeVisible()
    await expect(page.getByTestId('chat-quiz-option-continue')).toBeVisible()
    // Only the latest bubble paints CTAs — one view-recommend in the thread.
    await expect(page.getByTestId('chat-view-recommend')).toHaveCount(1)
  })

  test('profile sex + continue_chat: hydrate shows 生理男／女＋繼續聊聊; click streams', async ({
    page,
    goto
  }) => {
    // run22: core ships both; FE must not drop continue_chat when mixed with profile.
    test.setTimeout(90_000)
    const conversationId = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
    await mockCandorAuth(page, {
      asMember: true,
      replyActions: 'none',
      conversationPath: 'B'
    })
    await seedNoExpertCase(page)
    await page.setViewportSize({ width: 390, height: 844 })

    const sexContinueRa = {
      schema_version: '0.1',
      source: 'semantic_judgment',
      adaptor: 'fake',
      degraded: false,
      error: null,
      interaction: { round_status: 'current', outcome: null },
      actions: [
        { type: 'none', payload: {} },
        {
          type: 'choose_option',
          payload: {
            kind: 'profile',
            mode: 'single',
            confirm: false,
            gap_code: 'sex',
            answer_type: 'enum',
            options: [
              { code: 'M', label: '生理男', status: 'current' },
              { code: 'F', label: '生理女', status: 'current' }
            ]
          }
        },
        {
          type: 'choose_option',
          payload: {
            kind: 'continue_chat',
            mode: 'single',
            confirm: false,
            options: [{ code: 'continue_chat', label: '繼續聊聊', status: 'current' }]
          }
        }
      ]
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
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          status: 'success',
          data: {
            conversation_id: conversationId,
            path: 'b',
            messages: [
              {
                id: 'asst-sex-reask',
                role: 'assistant',
                content: '請問您的生理性別是？',
                reply_actions: sexContinueRa
              }
            ]
          }
        })
      })
    })

    // Live stream path: free-typed tangent → done carries the same RA mix.
    await page.route(`**/api/v1/conversation/${conversationId}/messages/stream`, async (route) => {
      const body = route.request().postData() || ''
      const content = body.includes('繼續聊聊')
        ? '好的，我們先聊聊睡眠。'
        : '這個問題有助於我們更貼近您的情況。請問您的生理性別是？'
      const reply_actions = body.includes('繼續聊聊')
        ? {
            schema_version: '0.1',
            degraded: false,
            error: null,
            actions: [{ type: 'none', payload: {} }]
          }
        : sexContinueRa
      const donePayload = {
        message_id: `msg-sex-continue-${Date.now()}`,
        claim_guard: 'passed',
        content,
        options: [],
        turn: { type: 'message' },
        profile_question: null,
        profile_gaps: body.includes('繼續聊聊') ? [] : ['sex'],
        reply_actions
      }
      const sse = [
        'event: delta',
        `data: ${JSON.stringify({ text: content })}`,
        '',
        'event: done',
        `data: ${JSON.stringify(donePayload)}`,
        '',
        ''
      ].join('\n')
      await route.fulfill({ status: 200, contentType: 'text/event-stream', body: sse })
    })

    await page.addInitScript((journey) => {
      localStorage.setItem('candor.unpaid.journey', JSON.stringify(journey))
    }, {
      conversationId,
      conversationPath: 'B',
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
      profileGaps: ['sex'],
      clarifyingGoals: ['睡眠'],
      expertReviewStatus: 'none'
    })

    await goto('/chat', { waitUntil: 'hydration' })

    const last = page.getByTestId('chat-last-reply')
    await expect(last).toContainText('請問您的生理性別是？', { timeout: 15_000 })
    await expect(last.getByTestId('chat-quiz-option-M')).toHaveText('生理男')
    await expect(last.getByTestId('chat-quiz-option-F')).toHaveText('生理女')
    await expect(last.getByTestId('chat-quiz-option-continue_chat')).toHaveText('繼續聊聊')
    await expect(last.getByTestId('chat-quiz-option-M')).toBeEnabled()
    await expect(last.getByTestId('chat-quiz-option-continue_chat')).toBeEnabled()

    const streamReq = page.waitForRequest((req) => {
      if (req.method() !== 'POST' || !req.url().includes('/messages/stream')) {
        return false
      }
      return (req.postData() || '').includes('繼續聊聊')
    }, { timeout: 20_000 })

    await last.getByTestId('chat-quiz-option-continue_chat').click()
    const stream = await streamReq
    expect(stream.postDataJSON()).toMatchObject({ content: '繼續聊聊' })
    await expect(page.getByTestId('chat-transcript')).toContainText('繼續聊聊', { timeout: 15_000 })
    await expect(page.getByTestId('chat-last-reply')).toContainText('好的，我們先聊聊睡眠', {
      timeout: 15_000
    })
  })
})
