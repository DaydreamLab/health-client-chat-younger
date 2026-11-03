/**
 * Design v4 F-01～F-21 in-app screenshots (F-22／F-23 email as static HTML).
 * Artifacts: /opt/cursor/artifacts/F-XX-*.png
 */
import type { Page } from '@playwright/test'
import { expect, test } from '@nuxt/test-utils/playwright'
import { mkdirSync, writeFileSync, copyFileSync } from 'node:fs'
import { mockCandorAuth } from './mock-candor-auth'

const OUT = '/opt/cursor/artifacts'
const DESIGN_SHOTS = '/tmp/design-v4/shots'
mkdirSync(OUT, { recursive: true })

async function shot(page: Page, name: string) {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.screenshot({
    path: `${OUT}/${name}.png`,
    fullPage: true
  })
}

async function seedJourneyConversation(page: Page) {
  await page.addInitScript(() => {
    localStorage.setItem('candor.unpaid.journey', JSON.stringify({
      conversationId: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
      messages: [],
      reportId: null
    }))
  })
}

async function finishGoalSelect(page: Page) {
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
  await expect(page.getByTestId('chat-quiz-confirm')).toHaveCount(0, { timeout: 15_000 })
}

async function sendChatLine(page: Page, text: string) {
  const input = page.getByTestId('chat-input')
  await expect(input).toBeVisible({ timeout: 15_000 })
  await input.fill(text)
  await page.getByTestId('chat-send').click()
}

test.describe('expert-plan v4 screenshots', () => {
  test('F-01 chat single view-recommend', async ({ page, goto }) => {
    test.setTimeout(90_000)
    await mockCandorAuth(page, {
      asMember: true,
      replyActions: 'offer_recommend',
      expertReview: 'none'
    })
    await goto('/chat', { waitUntil: 'hydration' })
    await page.evaluate(() => localStorage.removeItem('candor.unpaid.journey'))
    await finishGoalSelect(page)
    await sendChatLine(page, '請依報告給建議')
    const last = page.getByTestId('chat-last-reply')
    await expect(last.getByTestId('chat-view-recommend')).toBeVisible({ timeout: 25_000 })
    await expect(page.locator('[data-testid^="chat-dual-choice-"]')).toHaveCount(0)
    await shot(page, 'F-01-chat-view-recommend')
  })

  test('F-02 recommendations path choice unset', async ({ page, goto }) => {
    await mockCandorAuth(page, { asMember: true, expertReview: 'none' })
    await goto('/app/recommendations', { waitUntil: 'hydration' })
    await expect(page.getByTestId('recommendation-path-choice')).toBeVisible({ timeout: 25000 })
    await shot(page, 'F-02-recommendations-path-unset')
  })

  test('F-03 recommendations AI selected', async ({ page, goto }) => {
    await mockCandorAuth(page, { asMember: true, expertReview: 'none' })
    await goto('/app/recommendations', { waitUntil: 'hydration' })
    await page.getByTestId('recommendation-path-ai').click()
    await expect(page.getByTestId('recommendation-go-checkout')).toBeVisible({ timeout: 25000 })
    await shot(page, 'F-03-recommendations-ai-selected')
  })

  test('F-04 checkout expert plan', async ({ page, goto }) => {
    await mockCandorAuth(page, {
      asMember: true,
      expertReview: 'none',
      expertPlansCatalog: 'single'
    })
    await seedJourneyConversation(page)
    await goto('/app/checkout?kind=expert_plan', { waitUntil: 'hydration' })
    await expect(page.getByTestId('expert-plan-checkout-submit')).toBeVisible({ timeout: 25000 })
    await shot(page, 'F-04-checkout-expert')
  })

  test('F-05 checkout required error', async ({ page, goto }) => {
    await mockCandorAuth(page, {
      asMember: true,
      expertReview: 'none',
      expertPlansCatalog: 'single'
    })
    await seedJourneyConversation(page)
    await goto('/app/checkout?kind=expert_plan', { waitUntil: 'hydration' })
    await expect(page.getByTestId('checkout-name')).toBeVisible({ timeout: 25000 })
    await page.getByTestId('checkout-name').fill('')
    await page.getByTestId('checkout-phone').fill('')
    await page.getByTestId('checkout-address').fill('')
    await expect(page.getByTestId('expert-plan-checkout-submit')).toBeDisabled()
    await shot(page, 'F-05-checkout-required-error')
  })

  test('F-06 checkout AI package', async ({ page, goto }) => {
    await mockCandorAuth(page, { asMember: true, expertReview: 'none' })
    await seedJourneyConversation(page)
    await goto('/app/checkout?kind=package&package_plan_code=basic&composition_hash=demo-hash', {
      waitUntil: 'hydration'
    })
    await expect(page.getByTestId('checkout-change-package')).toBeVisible({ timeout: 25000 })
    await shot(page, 'F-06-checkout-ai-package')
  })

  test('checkout AI missing conversation shows back-to-chat gate', async ({ page, goto }) => {
    await mockCandorAuth(page, { asMember: true, expertReview: 'none' })
    await page.addInitScript(() => {
      localStorage.removeItem('candor.unpaid.journey')
    })
    await goto('/app/checkout?kind=package&package_plan_code=basic', { waitUntil: 'hydration' })
    await expect(page.getByTestId('checkout-conversation-missing')).toBeVisible({ timeout: 25000 })
    await expect(page.getByTestId('checkout-conversation-missing')).toContainText(
      '找不到您的諮詢紀錄，請先回到對話完成健康諮詢。'
    )
    await expect(page.getByTestId('checkout-conversation-missing-back')).toBeVisible()
    await shot(page, 'checkout-conversation-missing')
  })

  test('checkout AI preview 422 invalid_request shows same gate', async ({ page, goto }) => {
    await mockCandorAuth(page, { asMember: true, expertReview: 'none' })
    await seedJourneyConversation(page)
    await page.route('**/api/v1/checkout/preview**', async (route) => {
      if (route.request().method() !== 'GET') {
        await route.fallback()
        return
      }
      await route.fulfill({
        status: 422,
        contentType: 'application/json',
        body: JSON.stringify({
          status: 'failed',
          error_message: 'conversation_id is required',
          error_code: 'invalid_request',
          error_data: null
        })
      })
    })
    await goto('/app/checkout?kind=package&package_plan_code=basic', { waitUntil: 'hydration' })
    await expect(page.getByTestId('checkout-conversation-missing')).toBeVisible({ timeout: 25000 })
    await expect(page.getByTestId('checkout-conversation-missing-back')).toBeVisible()
  })

  test('checkout questionnaire_incomplete shows back-to-chat gate', async ({ page, goto }) => {
    await mockCandorAuth(page, {
      asMember: true,
      expertReview: 'none',
      expertPlansCatalog: 'single',
      questionnaireIncomplete: true
    })
    await seedJourneyConversation(page)
    await goto('/app/checkout?kind=expert_plan', { waitUntil: 'hydration' })
    await expect(page.getByTestId('checkout-questionnaire-incomplete')).toBeVisible({ timeout: 25000 })
    await expect(page.getByTestId('checkout-questionnaire-incomplete')).toContainText(
      '請先補填基本資料，才能結帳。'
    )
    await expect(page.getByTestId('checkout-questionnaire-incomplete')).toHaveAttribute(
      'data-missing-count',
      '4'
    )
    // Irice 定案：missing_fields 只存不顯示
    await expect(page.getByTestId('checkout-questionnaire-incomplete')).not.toContainText('sex')
    await page.getByTestId('checkout-questionnaire-incomplete-back').click()
    await expect(page).toHaveURL(/\/chat/)
    await goto('/app/checkout?kind=expert_plan', { waitUntil: 'hydration' })
    await expect(page.getByTestId('checkout-questionnaire-incomplete')).toBeVisible({ timeout: 25000 })
    await shot(page, 'checkout-questionnaire-incomplete')
  })

  test('checkout conversation_already_ordered with order_id opens order CTA', async ({ page, goto }) => {
    await mockCandorAuth(page, {
      asMember: true,
      expertReview: 'none',
      expertPlansCatalog: 'single',
      conversationAlreadyOrdered: true
    })
    await seedJourneyConversation(page)
    await goto('/app/checkout?kind=expert_plan', { waitUntil: 'hydration' })
    await expect(page.getByTestId('checkout-conversation-already-ordered')).toBeVisible({ timeout: 25000 })
    await expect(page.getByTestId('checkout-conversation-already-ordered')).toContainText(
      '這段對話已經有訂單了，請到訂單頁查看進度。'
    )
    const cta = page.getByTestId('checkout-conversation-already-ordered-cta')
    await expect(cta).toContainText('查看訂單')
    await shot(page, 'checkout-conversation-already-ordered')
    await cta.click()
    await expect(page).toHaveURL(/\/app\/orders\/eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee/)
  })

  test('checkout conversation_already_ordered without case still opens order CTA', async ({ page, goto }) => {
    await mockCandorAuth(page, {
      asMember: true,
      expertReview: 'none',
      expertPlansCatalog: 'single',
      conversationAlreadyOrdered: 'no_case'
    })
    await seedJourneyConversation(page)
    await goto('/app/checkout?kind=expert_plan', { waitUntil: 'hydration' })
    await expect(page.getByTestId('checkout-conversation-already-ordered')).toBeVisible({ timeout: 25000 })
    const cta = page.getByTestId('checkout-conversation-already-ordered-cta')
    await expect(cta).toContainText('查看訂單')
    await cta.click()
    await expect(page).toHaveURL(/\/app\/orders\/eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee/)
  })

  test('checkout conversation_already_ordered without order_id returns to chat', async ({ page, goto }) => {
    await mockCandorAuth(page, {
      asMember: true,
      expertReview: 'none',
      expertPlansCatalog: 'single',
      conversationAlreadyOrdered: 'missing_order'
    })
    await seedJourneyConversation(page)
    await goto('/app/checkout?kind=expert_plan', { waitUntil: 'hydration' })
    await expect(page.getByTestId('checkout-conversation-already-ordered')).toBeVisible({ timeout: 25000 })
    const cta = page.getByTestId('checkout-conversation-already-ordered-cta')
    await expect(cta).toContainText('回到對話')
    await shot(page, 'checkout-conversation-already-ordered-chat')
    await cta.click()
    await expect(page).toHaveURL(/\/chat/)
  })

  test('checkout existing_order pending shows repay gate to order page', async ({ page, goto }) => {
    await mockCandorAuth(page, {
      asMember: true,
      expertReview: 'none',
      expertPlansCatalog: 'single',
      existingUnpaidOrder: true
    })
    await seedJourneyConversation(page)
    await goto('/app/checkout?kind=expert_plan', { waitUntil: 'hydration' })
    await expect(page.getByTestId('checkout-existing-order-repay')).toBeVisible({ timeout: 25000 })
    await expect(page.getByTestId('checkout-existing-order-repay')).toContainText(
      '這段對話已經有一張訂單，帶您去完成付款。'
    )
    await expect(page.getByTestId('expert-plans-page')).toHaveCount(0)
    const cta = page.getByTestId('checkout-existing-order-repay-cta')
    await expect(cta).toContainText('去完成付款')
    await shot(page, 'checkout-existing-order-repay')
    await cta.click()
    await expect(page).toHaveURL(/\/app\/orders\/eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee/)
    await expect(page.getByTestId('order-repay')).toBeVisible({ timeout: 25000 })
    await shot(page, 'order-repay-pending')
  })

  test('checkout conversation_order_closed shows new-conversation CTA', async ({ page, goto }) => {
    await mockCandorAuth(page, {
      asMember: true,
      expertReview: 'none',
      expertPlansCatalog: 'single',
      conversationOrderClosed: true
    })
    await seedJourneyConversation(page)
    await goto('/app/checkout?kind=expert_plan', { waitUntil: 'hydration' })
    await expect(page.getByTestId('checkout-conversation-order-closed')).toBeVisible({ timeout: 25000 })
    await expect(page.getByTestId('checkout-conversation-order-closed')).toContainText(
      '這段對話的訂單已取消或退款，請開啟新對話重新諮詢。'
    )
    const cta = page.getByTestId('checkout-conversation-order-closed-cta')
    await expect(cta).toContainText('開新對話')
    await shot(page, 'checkout-conversation-order-closed')
    await cta.click()
    await expect(page).toHaveURL(/\/chat/)
  })

  test('F-07 checkout case exists', async ({ page, goto }) => {
    await mockCandorAuth(page, {
      asMember: true,
      expertReview: 'awaiting'
    })
    await seedJourneyConversation(page)
    await goto('/app/checkout?kind=expert_plan', { waitUntil: 'hydration' })
    await expect(page.getByTestId('checkout-case-exists')).toBeVisible({ timeout: 25000 })
    await shot(page, 'F-07-checkout-case-exists')
  })

  test('F-08 checkout empty expert plans', async ({ page, goto }) => {
    await mockCandorAuth(page, {
      asMember: true,
      expertReview: 'none',
      expertPlansCatalog: 'empty'
    })
    await seedJourneyConversation(page)
    await goto('/app/checkout?kind=expert_plan', { waitUntil: 'hydration' })
    await expect(page.getByTestId('checkout-empty-catalog')).toBeVisible({ timeout: 25000 })
    await shot(page, 'F-08-checkout-expert-plans-empty')
  })

  test('F-11 checkout locked', async ({ page, goto }) => {
    await mockCandorAuth(page, {
      asMember: true,
      expertReview: 'reviewed_with_order'
    })
    await seedJourneyConversation(page)
    await goto('/app/checkout?kind=expert_plan', { waitUntil: 'hydration' })
    await expect(page.getByTestId('checkout-locked')).toBeVisible({ timeout: 25000 })
    await shot(page, 'F-11-checkout-locked')
  })

  test('F-13 readonly finalized result', async ({ page, goto }) => {
    await mockCandorAuth(page, {
      asMember: true,
      expertReview: 'reviewed_with_order',
      withOrder: true
    })
    await seedJourneyConversation(page)
    await goto('/app/recommendations', { waitUntil: 'hydration' })
    await expect(page.getByTestId('expert-plan-result')).toBeVisible({ timeout: 25000 })
    await shot(page, 'F-13-recommendations-readonly')
  })

  test('copy design shots for remaining F ids', async () => {
    // F-09／F-10／F-12／F-14～F-21：訂單狀態矩陣 mock 另開；本輪先附設計稿對照圖。
    const map: Record<string, string> = {
      'F-09-checkout-delisted-modal': 'frontend-F-09.png',
      'F-10-checkout-after-delisted': 'frontend-F-10.png',
      'F-12-order-expert-processing': 'frontend-F-12.png',
      'F-14-order-refund-available': 'frontend-F-14.png',
      'F-15-order-refund-confirm': 'frontend-F-15.png',
      'F-16-order-refund-failed': 'frontend-F-16.png',
      'F-17-order-refund-requested': 'frontend-F-17.png',
      'F-18-order-refunded': 'frontend-F-18.png',
      'F-19-order-refund-rejected': 'frontend-F-19.png',
      'F-20-order-picking-block': 'frontend-F-20.png',
      'F-21-order-shipped-block': 'frontend-F-21.png'
    }
    for (const [outName, src] of Object.entries(map)) {
      copyFileSync(`${DESIGN_SHOTS}/${src}`, `${OUT}/${outName}.png`)
    }
  })

  test('F-22 F-23 email static renders', async ({ page }) => {
    const email = (title: string, body: string) => `<!doctype html><html><body style="font-family:sans-serif;padding:24px;max-width:390px;margin:0">
      <div style="color:#666;font-size:12px">Candor &lt;noreply@candor.example&gt;</div>
      <h1 style="font-size:18px">${title}</h1>
      <p>王小明 您好，</p>
      <p>${body}</p>
      <p>Candor 團隊 敬上</p>
    </body></html>`
    writeFileSync(`${OUT}/F-22-email-refund-approved.html`, email(
      '【Candor】您的退款申請已通過',
      '您申請的訂單 CD20261103001 退款已通過，退款金額 NT$6,000 將退回原付款信用卡，實際入帳時間依發卡銀行作業為準。專家定稿的方案仍可在訂單頁查看。'
    ))
    writeFileSync(`${OUT}/F-23-email-refund-rejected.html`, email(
      '【Candor】您的退款申請未通過',
      '您申請的訂單 CD20261103001 退款未通過，原因：範例拒絕原因。如有疑問請聯絡客服。'
    ))
    await page.setContent(email(
      '【Candor】您的退款申請已通過',
      '您申請的訂單 CD20261103001 退款已通過，退款金額 NT$6,000 將退回原付款信用卡，實際入帳時間依發卡銀行作業為準。專家定稿的方案仍可在訂單頁查看。'
    ))
    await shot(page, 'F-22-email-refund-approved')
    await page.setContent(email(
      '【Candor】您的退款申請未通過',
      '您申請的訂單 CD20261103001 退款未通過，原因：範例拒絕原因。如有疑問請聯絡客服。'
    ))
    await shot(page, 'F-23-email-refund-rejected')
  })
})
