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
  test('/chat: offer_recommend → 完成 CTA 提交專家判讀; legacy chips 不畫', async ({ page, goto }) => {
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
    // 完成 CTA：usable offer_recommend → FE 投影提交專家判讀（非 legacy 硬掛）
    await expect(last.getByTestId('chat-submit-expert-review')).toBeVisible({ timeout: 15_000 })
    await expect(last.getByTestId('chat-submit-expert-review')).toHaveText('提交專家判讀')
    await expect(last.getByTestId('chat-view-recommend')).toHaveCount(0)
    await expect(last.getByTestId('chat-message-upload')).toHaveCount(0)
    await expect(last.getByTestId('chat-quiz-option-legacy_chip')).toHaveCount(0)
    await expect(last.getByTestId('chat-message-checkup')).toHaveCount(0)
  })

  test('/chat: ask_report → 上傳必問; 不硬掛提交專家判讀', async ({ page, goto }) => {
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
  })

  test('/chat: intentional none → 不畫怪鈕（無 legacy 提交專家判讀）', async ({ page, goto }) => {
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

  test('lab_followup maps_to: upload chip opens attach; checkup chip is外連 (no answers POST)', async ({
    page,
    goto
  }) => {
    test.setTimeout(90_000)
    const conversationId = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
    const checkupUrl = 'https://labs.example/tests'
    await mockCandorAuth(page, {
      asMember: true,
      replyActions: 'offer_recommend',
      individualTestsUrl: checkupUrl
    })
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
              { id: 'u-fu', role: 'user', content: '無' },
              {
                id: 'bank-lab-followup',
                role: 'assistant',
                content: '去做檢查，看清各項指標',
                reply_actions: {
                  schema_version: '0.1',
                  source: 'semantic_judgment',
                  adaptor: 'fake',
                  degraded: false,
                  error: null,
                  actions: [{
                    type: 'choose_option',
                    payload: {
                      kind: 'lab_followup',
                      mode: 'single',
                      confirm: false,
                      options: [
                        { code: 'upload', label: '上傳報告', maps_to: 'ask_report' },
                        { code: 'go_checkup', label: '我想檢查', maps_to: 'offer_checkup' }
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
      expertReviewStatus: 'none'
    })

    let answersPosts = 0
    await page.route('**/api/v1/profile/answers', async (route) => {
      answersPosts += 1
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          status: 'success',
          data: { saved: true, profile_gaps: [], next_question: { done: true } }
        })
      })
    })

    await goto('/chat', { waitUntil: 'hydration' })

    const last = page.getByTestId('chat-last-reply')
    await expect(last).toContainText('去做檢查', { timeout: 15_000 })
    await expect(last.getByTestId('chat-quiz-option-upload')).toBeVisible()
    await expect(last.getByTestId('chat-quiz-option-go_checkup')).toBeVisible()

    // Checkup maps_to → window.open外連; never POST answers.
    const popupPromise = page.waitForEvent('popup')
    await last.getByTestId('chat-quiz-option-go_checkup').click()
    const popup = await popupPromise
    expect(popup.url()).toContain('labs.example/tests')
    await popup.close()
    expect(answersPosts).toBe(0)

    // Options cleared after click — re-hydrate for upload maps_to → attach menu.
    await goto('/chat', { waitUntil: 'hydration' })
    const followup = page.getByTestId('chat-last-reply')
    await expect(followup.getByTestId('chat-quiz-option-upload')).toBeVisible({ timeout: 15_000 })
    await followup.getByTestId('chat-quiz-option-upload').click()
    await expect(page.getByTestId('chat-attach-menu')).toBeVisible({ timeout: 10_000 })
    expect(answersPosts).toBe(0)
  })

  test('intake hybrid: answers next_question int does not bank; gap CTA from reply_actions', async ({
    page,
    goto
  }) => {
    test.setTimeout(90_000)
    await mockCandorAuth(page, { asMember: true, replyActions: 'intake_hybrid' })
    await page.setViewportSize({ width: 1280, height: 800 })
    await goto('/chat', { waitUntil: 'hydration' })
    await page.evaluate(() => localStorage.removeItem('candor.unpaid.journey'))

    await finishGoalSelect(page)

    // Goals → bank/history choose_option(sex) (hydrate may skip covering stream).
    const sexTurn = page.getByTestId('chat-last-reply')
    await expect(sexTurn).toContainText('生理性別', { timeout: 15_000 })
    await expect(sexTurn.getByTestId('chat-quiz-option-F')).toBeVisible()
    await expect(sexTurn.getByTestId('chat-quiz-option-legacy_chip')).toHaveCount(0)

    const sexPost = page.waitForRequest(req =>
      req.url().includes('/api/v1/profile/answers') && req.method() === 'POST'
    )
    await sexTurn.getByTestId('chat-quiz-option-F').click()
    const sexReq = await sexPost
    expect(sexReq.postDataJSON()).toMatchObject({ gap_code: 'sex', value: 'F' })

    // Trap: answers returns next_question age int. FE must NOT invent a local bank
    // bubble from that prompt; AskVitalsCard comes from message.reply_actions
    // (history hydrate and/or stream).
    const vitalsTurn = page.getByTestId('chat-last-reply')
    await expect(vitalsTurn).toContainText('年紀、身高與體重', { timeout: 15_000 })
    await expect(vitalsTurn.getByTestId('chat-vitals-card')).toBeVisible({ timeout: 15_000 })
    await expect(vitalsTurn.getByTestId('chat-vitals-age-picker')).toBeVisible()
    // Bank prompt alone must not be the CTA surface (no int chips / no vitals).
    await expect(page.getByText('請問您的年紀？')).toHaveCount(0)
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
