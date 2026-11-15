import { expect, test } from '@nuxt/test-utils/playwright'
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
      path: '/opt/cursor/artifacts/order-chat-cta-selected.png',
      fullPage: false
    })

    await listMd.scrollIntoViewIfNeeded()
    await page.screenshot({
      path: '/opt/cursor/artifacts/order-chat-markdown.png',
      fullPage: false
    })
  })
})
