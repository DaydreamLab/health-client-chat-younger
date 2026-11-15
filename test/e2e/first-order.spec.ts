import type { Page } from '@playwright/test'
import { expect, test } from '@nuxt/test-utils/playwright'
import { mockCandorAuth } from './mock-candor-auth'

/** Default candor mock seeds a reviewed expert case; clear so dock stays empty／clickable. */
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

/** 三要件之一：goals 必須先完成，完成 CTA 才依 RA 投影（非 legacy）。 */
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
  await expect(page.getByTestId('chat-quiz-confirm')).toHaveCount(0, { timeout: 15_000 })
}

/** Minimal 1×1 JPEG for photo-tray e2e (decoded by createImageBitmap). */
const jpegFile = (name: string) => ({
  name,
  mimeType: 'image/jpeg',
  buffer: Buffer.from(
    '/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAn/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCwAA//2Q==',
    'base64'
  )
})

test.describe('guest session', () => {
  test.beforeEach(async ({ page }) => {
    await mockCandorAuth(page)
  })

  test('guest upload redirects to login', async ({ page, goto }) => {
    await goto('/chat', { waitUntil: 'hydration' })
    await page.getByTestId('chat-upload').click()
    await expect(page).toHaveURL(/\/login/)
    expect(page.url()).toContain('redirect=')
    await expect(page.locator('header').getByTestId('brand')).toHaveAttribute('src', /brand-wordmark\.png$/)
    await expect(page.locator('header').getByTestId('nav-home')).toHaveCount(0)
  })

  test('empty report dock bar shows upload and checkup', async ({ page, goto }) => {
    await page.route('**/api/v1/client-config', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          status: 'success',
          data: { items: [], individual_tests_url: 'https://labs.example/tests', payment_methods: ['card', 'linepay', 'atm'] }
        })
      })
    })
    await goto('/chat', { waitUntil: 'hydration' })
    await expect(page.getByTestId('chat-report-dock')).toBeVisible()
    await expect(page.getByTestId('chat-report-dock-empty-prompt')).toContainText('若有檢查可以更清楚各項指標')
    await expect(page.getByTestId('chat-report-dock-upload')).toHaveText('上傳報告')
    await expect(page.getByTestId('chat-report-dock-checkup')).toHaveText('我想檢查')
    await expect(page.getByTestId('chat-report-dock-toggle')).toHaveCount(0)
    await expect(page.getByTestId('chat-photo')).toHaveCount(0)
  })

  test('recommendations opens path choice without expert-review GET', async ({ page, goto }) => {
    const expertGets: string[] = []
    page.on('request', (request) => {
      if (request.method() === 'GET' && request.url().includes('/expert-review')) {
        expertGets.push(request.url())
      }
    })
    await goto('/app/recommendations', { waitUntil: 'hydration' })
    await expect(page.getByTestId('recommendation-path-choice')).toBeVisible()
    await expect(page.getByTestId('recommendation-path-ai')).toBeVisible()
    await expect(page.getByTestId('recommendation-path-expert')).toBeVisible()
    await expect(page.getByTestId('expert-plan-result')).toHaveCount(0)
    expect(expertGets).toEqual([])
  })

  test('recommendations AI load error shows outside path choice', async ({ page, goto }) => {
    await page.route('**/api/v1/recommendations', async (route) => {
      if (route.request().method() !== 'POST') {
        await route.fallback()
        return
      }
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({
          status: 'failed',
          error_message: 'Internal error',
          error_code: 'internal_error'
        })
      })
    })
    await goto('/app/recommendations', { waitUntil: 'hydration' })
    await expect(page.getByTestId('recommendation-path-choice')).toBeVisible()
    await page.getByTestId('recommendation-path-ai').click()
    await expect(page.getByTestId('recommendation-error')).toBeVisible({ timeout: 15_000 })
    await expect(page.getByTestId('recommendation-error')).toContainText('暫時無法取得建議')
    await expect(page.getByTestId('recommendation-path-choice')).toBeVisible()
  })

  test('recommendations shows checkout auth gate for guest', async ({ page, goto }) => {
    await goto('/app/recommendations', { waitUntil: 'hydration' })
    await expect(page).toHaveURL(/\/app\/recommendations/)
    await expect(page.getByTestId('recommendation-path-choice')).toBeVisible()
    await page.getByTestId('recommendation-path-ai').click()
    await expect(page.getByTestId('package-plan-basic')).toBeVisible()
    await expect(page.getByTestId('package-plan-advance')).toBeVisible()
    await expect(page.getByTestId('package-rationale')).toBeVisible()
    await expect(page.getByTestId('rationale-group').first()).toBeVisible()
    await expect(page.getByTestId('rationale-entry').first()).toContainText('建議補充')
    await expect(page.getByTestId('rationale-product-badge').first()).toBeVisible()
    await expect(page.getByTestId('rationale-help-label').first()).toContainText('對應免疫提升')
    await expect(page.getByTestId('rationale-display-reason').first()).toContainText('顧問定稿原因')
    await expect(page.getByTestId('rationale-orphan-reason')).toContainText('無分組定稿原因')
    await expect(page.getByTestId('package-rationale')).toContainText('無分組定稿原因')
    await expect(page.getByTestId('package-items')).not.toContainText('顧問定稿原因')
    await expect(page.getByTestId('package-items')).not.toContainText('無分組定稿原因')
    // Member API no longer returns per-item prices; composition list must not show them.
    await expect(page.getByTestId('package-items')).not.toContainText('NT$')
    await expect(page.getByTestId('sellable-item-vitamin_d')).toContainText('維生素 D')
    await expect(page.getByTestId('package-plan-basic')).toContainText('NT$')
    await expect(page.getByTestId('recommendation-go-checkout')).toBeVisible()
    // Guest checkout gate is on /app/checkout after「前往結帳」.
    await page.getByTestId('recommendation-go-checkout').click()
    await expect(page).toHaveURL(/\/app\/checkout/)
    await expect(page.getByTestId('checkout-login')).toBeVisible()
    await expect(page.getByTestId('login-form')).toBeVisible()
    await expect(page.getByTestId('checkout-auth-gate')).toHaveCount(0)
  })

  test('visiting recommendations without report keeps empty report dock on chat', async ({ page, goto }) => {
    await page.route('**/api/v1/client-config', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          status: 'success',
          data: { items: [], individual_tests_url: 'https://labs.example/tests', payment_methods: ['card', 'linepay', 'atm'] }
        })
      })
    })
    await goto('/chat-ai', { waitUntil: 'hydration' })
    await expect(page.getByTestId('chat-report-dock')).toBeVisible()
    await goto('/app/recommendations', { waitUntil: 'hydration' })
    await expect(page.getByTestId('recommendation-path-choice')).toBeVisible()
    await goto('/chat-ai', { waitUntil: 'hydration' })
    await expect(page.getByTestId('chat-report-dock')).toBeVisible()
    await expect(page.getByTestId('chat-report-dock-empty-prompt')).toContainText('若有檢查可以更清楚各項指標')
    await expect(page.getByTestId('chat-report-dock-upload')).toHaveText('上傳報告')
  })

  test('guest sees in-page login on orders and stays after sign-in', async ({ page, goto }) => {
    await mockCandorAuth(page, { asMember: false })
    await goto('/app/orders', { waitUntil: 'hydration' })
    await expect(page.getByRole('heading', { name: '我的訂單' })).toBeVisible()
    await expect(page.getByTestId('nav-orders')).toBeVisible()
    await expect(page.getByTestId('orders-login')).toBeVisible()
    await expect(page.getByTestId('login-form')).toBeVisible()
    await expect(page.getByTestId('orders-empty')).toHaveCount(0)
    await expect(page.getByTestId('orders-auth-gate')).toHaveCount(0)
    await page.locator('input[type="email"]').fill('guest@example.com')
    await page.locator('input[type="password"]').fill('password12345')
    await page.getByTestId('login-form').locator('button[type="submit"]').click()
    await expect(page.getByTestId('orders-list').or(page.getByTestId('orders-empty'))).toBeVisible({
      timeout: 20_000
    })
    await expect(page).toHaveURL(/\/app\/orders\/?/)
    await expect(page.getByTestId('login-form')).toHaveCount(0)
  })
})

test.describe('member orders list states', () => {
  test('member with no API orders sees sample filled list until金流', async ({ page, goto }) => {
    await mockCandorAuth(page, { asMember: true, withOrder: false })
    await goto('/app/orders', { waitUntil: 'hydration' })
    await expect(page.getByTestId('orders-auth-gate')).toHaveCount(0)
    await expect(page.getByTestId('orders-sample-badge')).toBeVisible()
    await expect(page.getByTestId('orders-list')).toBeVisible()
    await expect(page.getByTestId('order-card-demo-order-paid')).toBeVisible()
    await expect(page.getByTestId('order-card-demo-order-paid').getByTestId('order-card-number')).toHaveText('ORD-20261020-001')
    await expect(page.getByTestId('order-card-demo-order-paid').getByTestId('order-card-summary')).toContainText('保健品月付方案')
    await expect(page.getByTestId('order-card-demo-order-paid').getByTestId('order-status')).toHaveAttribute('data-status', 'paid')
    await expect(page.getByTestId('order-card-demo-order-shipping').getByTestId('order-status')).toHaveAttribute('data-status', 'shipping')
    await expect(page.getByTestId('order-card-demo-order-completed').getByTestId('order-status')).toHaveAttribute('data-status', 'completed')

    await page.getByTestId('order-card-demo-order-shipping').click()
    await expect(page).toHaveURL(/\/app\/orders\/demo-order-shipping/)
    await expect(page.getByTestId('order-detail')).toBeVisible()
    await expect(page.getByTestId('order-number')).toContainText('ORD-20261018-002')
    await expect(page.getByTestId('order-package-items')).toBeVisible()
    await expect(page.getByTestId('order-payment-section')).toContainText('藍新')
    await expect(page.getByTestId('order-invoice-section')).toBeVisible()
    await expect(page.getByTestId('order-shipping-section')).toContainText('張小明')
    await expect(page.getByTestId('order-tracking-link')).toBeVisible()
    await page.getByTestId('order-detail-back').click()
    await expect(page).toHaveURL(/\/app\/orders\/?/)
  })

  test('member can force empty orders with ?demo=empty', async ({ page, goto }) => {
    await mockCandorAuth(page, { asMember: true, withOrder: false })
    await goto('/app/orders?demo=empty', { waitUntil: 'hydration' })
    await expect(page.getByTestId('orders-auth-gate')).toHaveCount(0)
    await expect(page.getByTestId('orders-empty')).toBeVisible()
    await expect(page.getByTestId('orders-empty')).toContainText('尚無訂單')
    await expect(page.getByTestId('orders-empty-chat')).toBeVisible()
    await expect(page.getByTestId('orders-list')).toHaveCount(0)
  })
})

test.describe('member order detail', () => {
  test.beforeEach(async ({ page }) => {
    await mockCandorAuth(page, { asMember: true, withOrder: true })
  })

  test('order detail shows Irice section cards with package items', async ({ page, goto }) => {
    await goto('/app/orders/eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', { waitUntil: 'hydration' })
    await expect(page.getByTestId('order-detail')).toBeVisible()
    await expect(page.getByTestId('order-number')).toContainText('ORD-260101-000001')
    await expect(page.getByTestId('order-detail-back')).toBeVisible()
    await expect(page.getByTestId('order-package-items')).toBeVisible()
    await expect(page.getByTestId('order-plan-label')).toHaveText('AI 建議方案')
    await expect(page.getByTestId('order-plan-name')).toHaveText('基礎保養')
    await expect(page.getByTestId('order-plan-price')).toContainText('NT$')
    await expect(page.getByTestId('order-item-vitamin_d')).toContainText('維生素 D')
    await expect(page.getByTestId('order-item-vitamin_d')).not.toContainText('NT$')
    await expect(page.getByTestId('order-item-iron')).toContainText('鐵蛋白調理')
    await expect(page.getByTestId('order-item-iron')).not.toContainText('NT$')
    await expect(page.getByTestId('order-item-vitamin_c')).not.toContainText('NT$')
    await expect(page.getByTestId('order-package-items')).toContainText('NT$')
    await expect(page.getByTestId('order-payment-section')).toBeVisible()
    await expect(page.getByTestId('order-invoice-section')).toBeVisible()
    await expect(page.getByTestId('order-shipping-section')).toContainText('林晏婷')
  })

  test('health profile shows consultation goal labels in Chinese', async ({ page, goto }) => {
    await goto('/app', { waitUntil: 'hydration' })
    await expect(page.getByRole('heading', { name: '我的健康' })).toBeVisible()
    await expect(page.getByRole('heading', { name: '健康報告' })).toBeVisible()
    await expect(page.getByTestId('health-review-records')).toHaveCount(0)
    await expect(page.getByTestId('health-stat-goals')).toContainText('睡眠')
    await expect(page.getByTestId('health-stat-goals')).toContainText('免疫提升')
    await expect(page.getByTestId('health-stat-goals')).not.toContainText('sleep')
    await expect(page.getByTestId('health-stat-goals')).not.toContainText('immune_boost')
  })
})

test.describe('member checkout', () => {
  test.beforeEach(async ({ page }) => {
    await mockCandorAuth(page, {
      asMember: true,
      individualTestsUrl: 'https://labs.example/tests'
    })
    await seedNoExpertCase(page)
  })

  test('empty report dock hides checkup when tests url is empty', async ({ page, goto }) => {
    await page.route('**/api/v1/client-config', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          status: 'success',
          data: { items: [], individual_tests_url: '', payment_methods: ['card'] }
        })
      })
    })
    await goto('/chat', { waitUntil: 'hydration' })
    await expect(page.getByTestId('chat-report-dock-empty-prompt')).toBeVisible()
    await expect(page.getByTestId('chat-report-dock-upload')).toBeVisible()
    await expect(page.getByTestId('chat-report-dock-checkup')).toHaveCount(0)
  })

  test('composer plus opens pdf and image menu; image opens photo tray', async ({ page, goto }) => {
    await goto('/chat', { waitUntil: 'hydration' })
    await page.evaluate(() => localStorage.removeItem('candor.unpaid.journey'))
    await expect(page.getByTestId('chat-photo')).toHaveCount(0)
    await page.getByTestId('chat-upload').click()
    await expect(page.getByTestId('chat-attach-menu')).toBeVisible()
    await expect(page.getByTestId('chat-attach-pdf')).toContainText('PDF')
    await expect(page.getByTestId('chat-attach-image')).toContainText('圖片')
    await page.getByTestId('chat-attach-image').click()
    await expect(page.getByTestId('chat-attach-menu')).toHaveCount(0)
    await expect(page.getByTestId('chat-photo-tray')).toBeVisible()
  })

  test('photo tray gallery uploads two images as one report', async ({ page, goto }) => {
    await page.route('**/api/v1/client-config', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          status: 'success',
          data: { items: [], individual_tests_url: 'https://labs.example/tests', payment_methods: ['card', 'linepay', 'atm'] }
        })
      })
    })
    await goto('/chat', { waitUntil: 'hydration' })
    await page.evaluate(() => localStorage.removeItem('candor.unpaid.journey'))
    await finishGoalSelect(page)
    await page.getByTestId('chat-upload').click()
    await page.getByTestId('chat-attach-image').click()
    await expect(page.getByTestId('chat-photo-tray')).toBeVisible()
    await page.getByTestId('chat-gallery-input').setInputFiles([
      jpegFile('page1.jpg'),
      jpegFile('page2.jpg')
    ])
    await expect(page.getByTestId('chat-photo-tray-list').locator('li')).toHaveCount(2)
    await page.getByTestId('chat-photo-tray-confirm').click()
    await expect(page.getByTestId('chat-photo-tray')).toHaveCount(0)
    await expect(page.getByTestId('chat-transcript')).toContainText('已上傳報告照片（2 張）')
    await expect(page.getByTestId('chat-report-interpret')).toBeVisible({ timeout: 15_000 })
    await expect(page.getByTestId('chat-report-dock-empty-prompt')).toHaveCount(0)
    const wantMore = page.getByTestId('chat-report-want-more-tests')
    await expect(wantMore).toHaveText('我想檢查更多')
    await expect(wantMore).toHaveAttribute('href', 'https://labs.example/tests')
    await expect(page.getByTestId('chat-report-more-tests')).toHaveCount(0)

    await page.getByTestId('chat-report-interpret').click()
    // Bubble外連改 RA-only（#20）：interpret 不再 FE 硬掛 wantMoreTestsOffer。
    // Dock「我想檢查更多」仍固定可點（#23 Irice 拍板）。
    // Irice 2026-10-28：有報告時「請助理說明重點」常駐（點過後不消失）。
    await expect(page.getByTestId('chat-last-reply')).toBeVisible({ timeout: 15_000 })
    await expect(page.getByTestId('chat-report-interpret')).toBeVisible()
    await expect(
      page.getByTestId('chat-last-reply').getByTestId('chat-message-want-more-tests')
    ).toHaveCount(0)
    await expect(page.getByTestId('chat-report-want-more-tests')).toBeVisible()
  })
})
