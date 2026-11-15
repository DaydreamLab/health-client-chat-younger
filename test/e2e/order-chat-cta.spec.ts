import { expect, test } from '@nuxt/test-utils/playwright'
import { e2eArtifactPath } from './helpers/artifacts-dir'
import { mockCandorAuth } from './mock-candor-auth'

/**
 * Order detail「查看訂單對話」CTA 紀錄須對齊 /chat 歷史：
 * selected 強調＋灰掉未選、markdown 換行、沿用 TurnActions。
 * 一律 stub API（不打真模型）。
 */
const ORDER_ID = 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee'

const historicalPathSwitchRa = {
  schema_version: '0.1',
  source: 'path_entry',
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
      kind: 'path_switch',
      mode: 'single',
      confirm: false,
      options: [
        { code: 'a', label: '我想聊聊', status: 'disabled' },
        { code: 'b', label: '我想諮詢健康方案', status: 'selected' },
        { code: 'c', label: '幫我看報告', status: 'disabled' }
      ]
    }
  }]
}

/** Beta ORD shape: selected_codes only, no confirm_status on wire. */
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

test.describe('order chat CTA history (align /chat)', () => {
  test('selected chip emphasized＋grey others; markdown newlines', async ({
    page,
    goto
  }) => {
    test.setTimeout(90_000)
    await mockCandorAuth(page, { asMember: true, withOrder: true })
    await page.setViewportSize({ width: 390, height: 844 })

    await page.route(`**/api/v1/order/${ORDER_ID}/message**`, async (route) => {
      if (route.request().method() !== 'GET') {
        await route.fallback()
        return
      }
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          status: 'success',
          data: {
            conversation_id: 'dddddddd-dddd-dddd-dddd-dddddddddddd',
            messages: [
              {
                id: 'om-asst-path',
                role: 'assistant',
                content: '你想先從哪裡開始？\n\n請選一項。',
                reply_actions: historicalPathSwitchRa
              },
              {
                id: 'om-user-path',
                role: 'user',
                content: '我想諮詢健康方案'
              },
              {
                id: 'om-asst-md',
                role: 'assistant',
                content: '已依你的目標組成方案。\n\n- 維生素 D\n- 鐵蛋白'
              }
            ]
          }
        })
      })
    })

    await goto(`/app/orders/${ORDER_ID}`, { waitUntil: 'hydration' })
    await expect(page.getByTestId('order-detail')).toBeVisible({ timeout: 15_000 })
    await page.getByTestId('order-view-chat').click()
    await expect(page.getByTestId('order-chat-modal')).toBeVisible()
    await expect(page.getByTestId('order-chat-messages')).toBeVisible({ timeout: 15_000 })

    const selectedChip = page.getByTestId('chat-quiz-option-b')
    await expect(selectedChip).toBeVisible()
    await expect(selectedChip).toHaveAttribute('data-cta-status', 'selected')
    await expect(selectedChip).toBeDisabled()
    await expect(selectedChip).toHaveClass(/is-selected/)

    const greyA = page.getByTestId('chat-quiz-option-a')
    const greyC = page.getByTestId('chat-quiz-option-c')
    await expect(greyA).toHaveAttribute('data-cta-status', 'disabled')
    await expect(greyC).toHaveAttribute('data-cta-status', 'disabled')
    await expect(greyA).toBeDisabled()
    await expect(greyC).toBeDisabled()
    await expect(greyA).toHaveClass(/is-disabled/)

    // Markdown newlines／lists via same ChatMarkdown as /chat (GFM breaks).
    const pathMd = page.locator('[data-testid="order-chat-messages"] .chat-md__body').first()
    await expect(pathMd.locator('p')).toHaveCount(2, { timeout: 5_000 })
    const listMd = page.locator('[data-testid="order-chat-messages"] .chat-md__body').last()
    await expect(listMd.locator('li')).toHaveCount(2)
    await expect(listMd).toContainText('維生素 D')

    // No secondary role labels (UI 原則).
    await expect(page.getByTestId('order-chat-messages')).not.toContainText('坦見')

    await selectedChip.scrollIntoViewIfNeeded()
    await page.screenshot({
      path: e2eArtifactPath('order-chat-cta-selected.png'),
      fullPage: false
    })

    await listMd.scrollIntoViewIfNeeded()
    await page.screenshot({
      path: e2eArtifactPath('order-chat-markdown.png'),
      fullPage: false
    })
  })

  test('multi confirm without confirm_status paints selected (order transcript)', async ({
    page,
    goto
  }) => {
    test.setTimeout(90_000)
    await mockCandorAuth(page, { asMember: true, withOrder: true })
    await page.setViewportSize({ width: 390, height: 844 })

    await page.route(`**/api/v1/order/${ORDER_ID}/message**`, async (route) => {
      if (route.request().method() !== 'GET') {
        await route.fallback()
        return
      }
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          status: 'success',
          data: {
            conversation_id: 'dddddddd-dddd-dddd-dddd-dddddddddddd',
            messages: [
              {
                id: 'om-asst-goals',
                role: 'assistant',
                content: '想先了解您希望優先改善的方向是什麼呢？',
                reply_actions: historicalMultiNoConfirmStatusRa
              },
              {
                id: 'om-user-goals',
                role: 'user',
                content: '睡眠'
              },
              {
                id: 'om-asst-next',
                role: 'assistant',
                content: '是否有血檢或健檢報告？'
              }
            ]
          }
        })
      })
    })

    await goto(`/app/orders/${ORDER_ID}`, { waitUntil: 'hydration' })
    await expect(page.getByTestId('order-detail')).toBeVisible({ timeout: 15_000 })
    await page.getByTestId('order-view-chat').click()
    await expect(page.getByTestId('order-chat-modal')).toBeVisible()
    await expect(page.getByTestId('order-chat-messages')).toBeVisible({ timeout: 15_000 })

    const sleepChip = page.getByTestId('chat-quiz-option-sleep')
    await expect(sleepChip).toBeVisible()
    await expect(sleepChip).toHaveAttribute('data-cta-status', 'selected')
    await expect(sleepChip).toHaveClass(/is-selected/)

    const confirmBtn = page.getByTestId('chat-quiz-confirm')
    await expect(confirmBtn).toBeVisible()
    await expect(confirmBtn).toHaveAttribute('data-cta-status', 'selected')
    await expect(confirmBtn).toHaveClass(/is-selected/)
    await expect(confirmBtn).toBeDisabled()

    await expect(page.getByTestId('chat-quiz-option-weight_loss'))
      .toHaveAttribute('data-cta-status', 'disabled')

    await confirmBtn.scrollIntoViewIfNeeded()
    await page.screenshot({
      path: e2eArtifactPath('order-chat-multi-confirm-selected.png'),
      fullPage: false
    })
  })

  /**
   * Core #197：cta_resolution.selected_action_types=["offer_recommend"] →
   * GET order messages stamp offer_recommend status=selected.
   * Order modal must paint selected（not blanket grey／disabled-tone）.
   */
  test('offer_recommend selected paints is-selected (not grey)', async ({
    page,
    goto
  }) => {
    test.setTimeout(90_000)
    await mockCandorAuth(page, { asMember: true, withOrder: true })
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

    await page.route(`**/api/v1/order/${ORDER_ID}/message**`, async (route) => {
      if (route.request().method() !== 'GET') {
        await route.fallback()
        return
      }
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          status: 'success',
          data: {
            conversation_id: 'dddddddd-dddd-dddd-dddd-dddddddddddd',
            messages: [
              {
                id: 'om-asst-offer-selected',
                role: 'assistant',
                content: '推薦輪訊息（已選查看推薦方案）。',
                reply_actions: historicalOfferSelectedRa
              },
              {
                id: 'om-user-reco',
                role: 'user',
                content: '查看推薦方案'
              }
            ]
          }
        })
      })
    })

    await goto(`/app/orders/${ORDER_ID}`, { waitUntil: 'hydration' })
    await expect(page.getByTestId('order-detail')).toBeVisible({ timeout: 15_000 })
    await page.getByTestId('order-view-chat').click()
    await expect(page.getByTestId('order-chat-modal')).toBeVisible()
    await expect(page.getByTestId('order-chat-messages')).toBeVisible({ timeout: 15_000 })

    const viewReco = page.getByTestId('chat-view-recommend')
    await expect(viewReco).toBeVisible()
    await expect(viewReco).toHaveAttribute('data-cta-status', 'selected')
    await expect(viewReco).toHaveClass(/is-selected/)
    await expect(viewReco).not.toHaveClass(/is-disabled-tone/)
    await expect(viewReco).toBeDisabled()

    await expect(page.getByTestId('chat-quiz-option-continue'))
      .toHaveAttribute('data-cta-status', 'disabled')

    await viewReco.scrollIntoViewIfNeeded()
    await page.screenshot({
      path: e2eArtifactPath('order-chat-offer-recommend-selected.png'),
      fullPage: false
    })
  })

  /**
   * Reproduce beta ORD truncate: completion open-head still `current` after
   *「繼續健康諮詢」— order modal must still show「查看推薦方案」, and later
   * recommend／checkout turns from the fixture must all render.
   */
  test('completion current + later recommend／checkout turns all show', async ({
    page,
    goto
  }) => {
    test.setTimeout(90_000)
    await mockCandorAuth(page, { asMember: true, withOrder: true })
    await page.setViewportSize({ width: 390, height: 844 })

    const openHeadCompletionCurrent = {
      schema_version: '0.1',
      source: 'semantic_judgment',
      adaptor: 'fake',
      degraded: false,
      error: null,
      interaction: {
        round_status: 'current',
        outcome: null
      },
      actions: [
        {
          type: 'offer_recommend',
          payload: {
            mode: 'view_recommendations',
            label: '查看推薦方案',
            path: '/app/recommendations',
            status: 'current'
          }
        },
        {
          type: 'choose_option',
          payload: {
            kind: 'continue_consultation',
            mode: 'single',
            confirm: false,
            options: [
              { code: 'continue', label: '繼續健康諮詢', status: 'current' }
            ]
          }
        }
      ]
    }

    await page.route(`**/api/v1/order/${ORDER_ID}/message**`, async (route) => {
      if (route.request().method() !== 'GET') {
        await route.fallback()
        return
      }
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          status: 'success',
          data: {
            conversation_id: 'dddddddd-dddd-dddd-dddd-dddddddddddd',
            messages: [
              {
                id: 'om-asst-lab',
                role: 'assistant',
                content: '是否有血檢或健檢報告？'
              },
              {
                id: 'om-user-lab',
                role: 'user',
                content: '無'
              },
              {
                id: 'om-asst-complete',
                role: 'assistant',
                content: '如果去做一次檢查，之後可以更清楚各項指標。',
                reply_actions: openHeadCompletionCurrent
              },
              {
                id: 'om-user-reco',
                role: 'user',
                content: '查看推薦方案'
              },
              {
                id: 'om-asst-checkout',
                role: 'assistant',
                content: '方案已就緒，可前往結帳完成訂單。'
              },
              {
                id: 'om-user-checkout',
                role: 'user',
                content: '前往結帳'
              }
            ]
          }
        })
      })
    })

    await goto(`/app/orders/${ORDER_ID}`, { waitUntil: 'hydration' })
    await expect(page.getByTestId('order-detail')).toBeVisible({ timeout: 15_000 })
    await page.getByTestId('order-view-chat').click()
    await expect(page.getByTestId('order-chat-modal')).toBeVisible()
    const list = page.getByTestId('order-chat-messages')
    await expect(list).toBeVisible({ timeout: 15_000 })

    // Before fix: only「繼續健康諮詢」chip; offer_recommend dropped by readonly+current.
    await expect(list.getByText('繼續健康諮詢')).toBeVisible()
    const viewReco = page.getByTestId('chat-view-recommend')
    await expect(viewReco).toBeVisible()
    await expect(viewReco).toBeDisabled()

    // Later recommend／checkout turns must not be truncated from the list.
    await expect(list.getByText('查看推薦方案', { exact: true }).last()).toBeVisible()
    await expect(list).toContainText('方案已就緒，可前往結帳完成訂單。')
    await expect(list.getByText('前往結帳', { exact: true })).toBeVisible()

    await viewReco.scrollIntoViewIfNeeded()
    await page.screenshot({
      path: e2eArtifactPath('order-chat-completion-with-recommend.png'),
      fullPage: false
    })

    await list.getByText('前往結帳', { exact: true }).scrollIntoViewIfNeeded()
    await page.screenshot({
      path: e2eArtifactPath('order-chat-complete-through-checkout.png'),
      fullPage: false
    })
  })
})
