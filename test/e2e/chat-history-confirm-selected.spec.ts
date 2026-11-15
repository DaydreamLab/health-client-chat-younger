import { expect, test } from '@nuxt/test-utils/playwright'
import { e2eArtifactPath } from './helpers/artifacts-dir'
import { mockCandorAuth } from './mock-candor-auth'

/**
 * /chat history reload: multi＋confirm with only selected_codes (no confirm_status)
 * must paint confirm as selected — same hydrate as order transcript.
 * Stub API only（不打真模型）.
 */
const conversationId = 'cccccccc-cccc-4ccc-8ccc-ccccccccccc1'

/** Beta ORD shape mirrored for /chat GET …/messages. */
const historicalMultiNoConfirmStatusRa = {
  schema_version: '0.1',
  source: 'rule',
  adaptor: 'fake',
  degraded: false,
  error: null,
  interaction: {
    round_status: 'historical',
    outcome: 'option_selected'
  },
  actions: [{
    type: 'choose_option',
    payload: {
      kind: 'consultation_goals',
      mode: 'multi',
      confirm: true,
      answer_type: 'multi_enum',
      options: [
        { code: 'sleep', label: '睡眠', status: 'selected' },
        { code: 'weight_loss', label: '減重', status: 'disabled' },
        { code: 'immune_boost', label: '免疫提升', status: 'disabled' },
        { code: 'cognitive_function', label: '認知功能', status: 'disabled' },
        { code: 'gastrointestinal', label: '腸胃道', status: 'disabled' }
      ],
      selected: ['sleep']
    }
  }]
}

test.describe('/chat history multi confirm selected', () => {
  test('reload history without confirm_status → confirm selected', async ({
    page,
    goto
  }) => {
    test.setTimeout(90_000)
    await mockCandorAuth(page, { asMember: true, replyActions: 'none' })
    await page.setViewportSize({ width: 390, height: 844 })

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
                id: 'asst-goals',
                role: 'assistant',
                content: '想先了解您希望優先改善的方向是什麼呢？',
                reply_actions: historicalMultiNoConfirmStatusRa
              },
              {
                id: 'user-goals',
                role: 'user',
                content: '睡眠'
              },
              {
                id: 'asst-next',
                role: 'assistant',
                content: '是否有血檢或健檢報告？',
                reply_actions: {
                  schema_version: '0.1',
                  interaction: { round_status: 'current', outcome: null },
                  actions: [{ type: 'none', payload: {} }]
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
      conversationPath: 'B'
    })

    await goto('/chat', { waitUntil: 'hydration' })

    const retained = page.locator(
      '[data-testid="chat-turn-actions"][data-round-status="historical"]'
    ).first()
    await expect(retained).toBeVisible({ timeout: 15_000 })

    const sleepChip = retained.getByTestId('chat-quiz-option-sleep')
    await expect(sleepChip).toHaveAttribute('data-cta-status', 'selected')
    await expect(sleepChip).toHaveClass(/is-selected/)

    const confirmBtn = retained.getByTestId('chat-quiz-confirm')
    await expect(confirmBtn).toBeVisible()
    await expect(confirmBtn).toHaveAttribute('data-cta-status', 'selected')
    await expect(confirmBtn).toHaveClass(/is-selected/)
    await expect(confirmBtn).toBeDisabled()

    await expect(retained.getByTestId('chat-quiz-option-weight_loss'))
      .toHaveAttribute('data-cta-status', 'disabled')

    await confirmBtn.scrollIntoViewIfNeeded()
    await page.screenshot({
      path: e2eArtifactPath('chat-history-multi-confirm-selected.png'),
      fullPage: false
    })
  })

  /**
   * Core folds cta_resolution.selected_action_types=["offer_recommend"] into
   * reply_actions offer_recommend payload.status=selected. /chat history reload
   * must paint is-selected (not blanket grey); unselected stay disabled.
   */
  test('reload history: offer_recommend selected paints is-selected', async ({
    page,
    goto
  }) => {
    test.setTimeout(90_000)
    await mockCandorAuth(page, { asMember: true, replyActions: 'none' })
    await page.setViewportSize({ width: 390, height: 844 })

    const historicalOfferSelectedRa = {
      schema_version: '0.1',
      source: 'semantic_judgment',
      adaptor: 'fake',
      degraded: false,
      error: null,
      interaction: {
        round_status: 'historical',
        outcome: 'option_selected'
      },
      actions: [
        {
          type: 'offer_recommend',
          payload: {
            mode: 'view_recommendations',
            label: '查看推薦方案',
            path: '/app/recommendations',
            status: 'selected'
          }
        },
        {
          type: 'choose_option',
          payload: {
            kind: 'continue_consultation',
            mode: 'single',
            confirm: false,
            options: [
              { code: 'continue', label: '繼續健康諮詢', status: 'disabled' }
            ]
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
                id: 'asst-offer-selected',
                role: 'assistant',
                content: '推薦輪訊息（已選查看推薦方案）。',
                reply_actions: historicalOfferSelectedRa
              },
              {
                id: 'user-reco',
                role: 'user',
                content: '查看推薦方案'
              },
              {
                id: 'asst-next',
                role: 'assistant',
                content: '方案已就緒。',
                reply_actions: {
                  schema_version: '0.1',
                  interaction: { round_status: 'current', outcome: null },
                  actions: [{ type: 'none', payload: {} }]
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
      conversationPath: 'B'
    })

    await goto('/chat', { waitUntil: 'hydration' })

    const retained = page.locator(
      '[data-testid="chat-turn-actions"][data-round-status="historical"]'
    ).first()
    await expect(retained).toBeVisible({ timeout: 15_000 })

    const viewReco = retained.getByTestId('chat-view-recommend')
    await expect(viewReco).toBeVisible()
    await expect(viewReco).toHaveAttribute('data-cta-status', 'selected')
    await expect(viewReco).toHaveClass(/is-selected/)
    await expect(viewReco).not.toHaveClass(/is-disabled-tone/)
    await expect(viewReco).toBeDisabled()

    await expect(retained.getByTestId('chat-quiz-option-continue'))
      .toHaveAttribute('data-cta-status', 'disabled')

    await viewReco.scrollIntoViewIfNeeded()
    await page.screenshot({
      path: e2eArtifactPath('chat-history-offer-recommend-selected.png'),
      fullPage: false
    })
  })
})
