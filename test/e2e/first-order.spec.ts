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
    await expect(page.getByTestId('checkout-auth-gate')).toBeVisible()
    await expect(page.getByTestId('checkout-login')).toBeVisible()
    await expect(page.getByTestId('checkout-register')).toBeVisible()
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

  test('guest sees auth gate on orders with return path and chat exit', async ({ page, goto }) => {
    await goto('/app/orders', { waitUntil: 'hydration' })
    await expect(page.getByRole('heading', { name: '我的訂單' })).toBeVisible()
    await expect(page.getByTestId('nav-orders')).toBeVisible()
    await expect(page.getByTestId('orders-auth-gate')).toBeVisible()
    await expect(page.getByTestId('orders-empty')).toHaveCount(0)
    await expect(page.getByTestId('orders-login')).toBeVisible()
    await expect(page.getByTestId('orders-register')).toBeVisible()
    await expect(page.getByTestId('orders-back-chat')).toBeVisible()
    await page.getByTestId('orders-login').click()
    await expect(page).toHaveURL(/\/login/)
    expect(page.url()).toContain('redirect=')
    expect(decodeURIComponent(new URL(page.url()).searchParams.get('redirect') || '')).toMatch(/\/app\/orders/)
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

  test('report card collapses in place and opens a reading window', async ({ page, goto }) => {
    const reportId = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'
    const results = Array.from({ length: 24 }, (_, index) => {
      const value = 40 + index
      const outOfRange = value > 40
      return {
        id: `result-e2e-${index}`,
        raw_name: `Marker ${index}`,
        name_zh: `指標 ${index}`,
        name_zh_source: 'ai' as const,
        raw_value: String(value),
        value_numeric: value,
        unit: 'U/L',
        ref_low: 10,
        ref_high: 40,
        critical_high: 60,
        needs_review: false,
        range_status: outOfRange ? 'high' as const : 'normal' as const,
        ...(outOfRange
          ? {
              description: `指標 ${index} 是常見檢驗項目。`,
              possible_causes: `偏高可能與生活型態有關（${index}）。`,
              possible_risks: `偏高時可能需要留意相關健康狀態（${index}）。`
            }
          : {})
      }
    })
    await page.route('**/api/v1/health-reports', async (route) => {
      const path = new URL(route.request().url()).pathname.replace(/\/$/, '')
      if (route.request().method() !== 'GET' || !path.endsWith('/health-reports')) {
        await route.fallback()
        return
      }
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          status: 'success',
          data: {
            reports: [{
              id: reportId,
              status: 'needs_review',
              created_at: '2026-10-02T07:39:00Z'
            }],
            total: 1
          }
        })
      })
    })
    await page.route(`**/api/v1/health-reports/${reportId}`, async (route) => {
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
            id: reportId,
            status: 'needs_review',
            results
          }
        })
      })
    })

    await page.setViewportSize({ width: 1280, height: 800 })
    await goto('/app', { waitUntil: 'hydration' })

    const card = page.getByTestId(`health-report-${reportId}`)
    await expect(card.getByText('報告樣式1')).toHaveCount(0)
    await expect(card.getByText('報告樣式2')).toHaveCount(0)
    await expect(page.getByTestId(`health-report-cards-${reportId}`)).toHaveCount(0)
    await expect(card.getByTestId('health-report-view-cards')).toHaveAttribute('aria-pressed', 'true')
    await expect(card.getByTestId('health-report-expand')).toHaveText('展開報告')
    await expect(card.getByTestId('health-report-detail')).toBeVisible()
    await expect(card.getByTestId('report-result-card-result-e2e-0')).toBeVisible()
    await expect(card.getByTestId('report-result-card-result-e2e-0')).toContainText('指標 0')
    await expect(card.getByTestId('report-result-card-position-result-e2e-0')).toBeVisible()
    await expect(card.getByTestId('report-result-card-status-result-e2e-0')).toHaveText('最佳')
    await expect(card.getByTestId('report-result-card-status-result-e2e-1')).toHaveText('提醒')
    await expect(card.getByTestId('report-result-card-status-result-e2e-21')).toHaveText('警戒')
    await expect(card.getByTestId('report-result-info-result-e2e-1')).toBeVisible()
    await expect(card.getByTestId('report-result-card-result-e2e-1')).not.toContainText('這是什麼')
    await expect(card.getByTestId('report-result-raw-name-result-e2e-1')).toContainText('Marker 1')

    await card.getByTestId('report-result-info-result-e2e-1').click()
    const infoDialog = page.getByRole('dialog')
    await expect(infoDialog).toBeVisible()
    await expect(infoDialog.getByTestId('report-result-interpretation-result-e2e-1')).toContainText('這是什麼')
    await expect(infoDialog.getByTestId('report-result-interpretation-result-e2e-1')).toContainText('可能原因')
    await expect(infoDialog.getByTestId('report-result-interpretation-result-e2e-1')).toContainText('可能風險')
    await page.keyboard.press('Escape')
    await expect(infoDialog).toHaveCount(0)

    const shell = await page.evaluate(() => {
      const sidebar = document.getElementById('user-sidebar')
      const main = document.querySelector('main')
      const mainStyle = main ? getComputedStyle(main) : null
      return {
        windowScroll: window.scrollY,
        sidebarTop: sidebar?.getBoundingClientRect().top ?? -1,
        sidebarHeight: sidebar?.getBoundingClientRect().height ?? 0,
        mainOverflowY: mainStyle?.overflowY ?? '',
        mainScrollbar: mainStyle?.scrollbarWidth ?? '',
        mainClient: main?.clientHeight ?? 0,
        mainScroll: main?.scrollHeight ?? 0
      }
    })
    expect(shell.windowScroll).toBe(0)
    expect(shell.sidebarTop).toBe(0)
    expect(shell.sidebarHeight).toBe(800)
    expect(shell.mainOverflowY).toBe('auto')
    expect(shell.mainScrollbar).toBe('none')
    expect(shell.mainScroll).toBeGreaterThan(shell.mainClient)

    const mainScrollTop = await page.locator('main').evaluate((el) => {
      el.scrollTop = 240
      return el.scrollTop
    })
    const afterScroll = await page.evaluate(() => ({
      windowScroll: window.scrollY,
      sidebarTop: document.getElementById('user-sidebar')?.getBoundingClientRect().top ?? -1
    }))
    expect(mainScrollTop).toBeGreaterThan(0)
    expect(afterScroll.windowScroll).toBe(0)
    expect(afterScroll.sidebarTop).toBe(0)

    const cardMetrics = await card.evaluate((el) => {
      const scroller = el.querySelector('[data-testid="report-result-cards-scroller"]')
      const style = getComputedStyle(el)
      return {
        height: el.getBoundingClientRect().height,
        maxHeight: Number.parseFloat(style.maxHeight),
        scrollHeight: scroller?.scrollHeight ?? 0,
        clientHeight: scroller?.clientHeight ?? 0,
        overflowY: scroller ? getComputedStyle(scroller).overflowY : ''
      }
    })
    expect(cardMetrics.maxHeight).toBeGreaterThan(0)
    expect(cardMetrics.height).toBeLessThanOrEqual(cardMetrics.maxHeight + 1)
    expect(cardMetrics.scrollHeight).toBeGreaterThan(cardMetrics.clientHeight)
    expect(cardMetrics.overflowY).toMatch(/auto|scroll/)

    await card.getByTestId('health-report-toggle').click()
    await expect(card.getByTestId('health-report-detail')).toHaveCount(0)
    await expect(page.getByRole('dialog')).toHaveCount(0)

    await card.getByRole('button', { name: '展開', exact: true }).click()
    await expect(card.getByTestId('health-report-detail')).toBeVisible()
    await expect(page.getByRole('dialog')).toHaveCount(0)

    await card.getByTestId('health-report-expand').click()
    const dialog = page.getByRole('dialog')
    await expect(dialog).toBeVisible()
    await expect(dialog.getByRole('heading', { name: '報告判讀' })).toBeVisible()
    await expect(dialog).not.toContainText('展開報告')
    const sheetToggle = await dialog.getByTestId('health-report-view').boundingBox()
    const sheetClose = await dialog.locator('[data-slot="close"]').boundingBox()
    expect(sheetToggle).not.toBeNull()
    expect(sheetClose).not.toBeNull()
    expect((sheetToggle?.x ?? 0) + (sheetToggle?.width ?? 0)).toBeLessThan(sheetClose?.x ?? 0)
    await expect(dialog.getByTestId('health-report-view-cards')).toHaveAttribute('aria-pressed', 'true')
    await expect(dialog.getByTestId('report-result-card-result-e2e-0')).toBeVisible()
    await expect(dialog.getByRole('columnheader')).toHaveCount(0)
    await expect(dialog.getByText('數值依參考區間著色')).toBeVisible()

    const sheetMetrics = await dialog.evaluate(async (el) => {
      await Promise.all(el.getAnimations().map(animation => animation.finished))
      const scroller = el.querySelector('[data-testid="report-result-cards-scroller"]')
      return {
        height: el.getBoundingClientRect().height,
        scrollHeight: scroller?.scrollHeight ?? 0,
        clientHeight: scroller?.clientHeight ?? 0,
        overflowY: scroller ? getComputedStyle(scroller).overflowY : ''
      }
    })
    const viewport = page.viewportSize()
    expect(viewport).not.toBeNull()
    const viewportHeight = viewport?.height ?? 0
    expect(sheetMetrics.height).toBeGreaterThan(viewportHeight - 48 - 8)
    expect(sheetMetrics.height).toBeLessThan(viewportHeight - 48 + 8)
    expect(sheetMetrics.scrollHeight).toBeGreaterThan(sheetMetrics.clientHeight)
    expect(sheetMetrics.overflowY).toMatch(/auto|scroll/)

    await page.keyboard.press('Escape')
    await expect(dialog).toHaveCount(0)
    await expect(card.getByTestId('health-report-detail')).toBeVisible()

    await card.getByTestId('health-report-view-table').click()
    await expect(card.getByTestId('report-result-strip-result-e2e-0')).toBeVisible()
    await expect(card.getByTestId('report-result-strip-position-result-e2e-0')).toBeVisible()
    await expect(card.getByTestId('report-result-strip-status-result-e2e-0')).toHaveText('最佳')
    await expect(card.getByTestId('report-result-card-result-e2e-0')).toHaveCount(0)
    await expect(card.getByTestId('report-result-info-result-e2e-1')).toBeVisible()

    await card.getByTestId('health-report-view-cards').click()
    await card.getByTestId('health-report-expand').click()
    await expect(dialog).toBeVisible()
    await expect(dialog.getByTestId('health-report-view-cards')).toHaveAttribute('aria-pressed', 'true')
    await expect(dialog.getByTestId('report-result-card-result-e2e-0')).toBeVisible()
    await expect(dialog.getByTestId('report-result-card-status-result-e2e-0')).toHaveText('最佳')
    await expect(dialog.getByRole('columnheader')).toHaveCount(0)

    await dialog.getByTestId('health-report-view-table').click()
    await expect(dialog.getByTestId('report-result-strip-result-e2e-0')).toBeVisible()
    await expect(dialog.getByRole('columnheader')).toHaveCount(0)
    await expect(dialog.getByTestId('report-result-strip-status-result-e2e-1')).toHaveText('提醒')
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

test.describe('askInterpret copy by goals', () => {
  const interpretWithGoals = '請根據這份報告，配合我這次選定的改善方向說明重點'
  const interpretNoGoals = '請根據這份報告說明重點'

  test('path B with goals → askInterpret + intent interpret', async ({ page, goto }) => {
    test.setTimeout(120_000)
    await mockCandorAuth(page, {
      asMember: true,
      conversationPath: null,
      basicProfileComplete: true,
      individualTestsUrl: 'https://labs.example/tests'
    })
    await seedNoExpertCase(page)
    await goto('/', { waitUntil: 'hydration' })
    await page.evaluate(() => localStorage.removeItem('candor.unpaid.journey'))
    await goto('/chat', { waitUntil: 'hydration' })

    await finishGoalSelect(page)
    // Chip confirm writes journey.clarifyingGoals from goal option labels.
    await expect(page.getByTestId('chat-transcript')).toContainText('睡眠', { timeout: 15_000 })

    await page.getByTestId('chat-upload-input').setInputFiles({
      name: 'labs.pdf',
      mimeType: 'application/pdf',
      buffer: Buffer.from('%PDF-1.4 mock')
    })
    await expect(page.getByTestId('chat-report-interpret')).toBeVisible({ timeout: 15_000 })

    const interpretStream = page.waitForRequest((req) => {
      if (req.method() !== 'POST' || !req.url().includes('/messages/stream')) {
        return false
      }
      const data = req.postData() || ''
      return data.includes(interpretWithGoals) && data.includes('"intent":"interpret"')
    })
    await page.getByTestId('chat-report-interpret').click()
    const streamReq = await interpretStream
    const streamBody = JSON.parse(streamReq.postData() || '{}') as {
      content?: string
      intent?: string
    }
    expect(streamBody.content).toBe(interpretWithGoals)
    expect(streamBody.intent).toBe('interpret')
    await expect(page.getByTestId('chat-transcript')).toContainText(interpretWithGoals)
  })

  test('path C upload without goals → askInterpretNoGoals + intent interpret', async ({
    page,
    goto
  }) => {
    test.setTimeout(120_000)
    await mockCandorAuth(page, {
      asMember: true,
      conversationPath: null,
      basicProfileComplete: true,
      individualTestsUrl: 'https://labs.example/tests'
    })
    await seedNoExpertCase(page)
    await goto('/', { waitUntil: 'hydration' })
    await page.evaluate(() => localStorage.removeItem('candor.unpaid.journey'))
    await goto('/chat', { waitUntil: 'hydration' })

    const entryC = page.getByTestId('chat-quiz-option-c')
    await expect(entryC).toBeVisible({ timeout: 15_000 })
    await entryC.click()
    await expect(page.getByTestId('chat-quiz-option-c')).toHaveCount(0, { timeout: 15_000 })

    await page.getByTestId('chat-message-upload').click()
    await page.setInputFiles('[data-testid="chat-upload-input"]', {
      name: 'labs.pdf',
      mimeType: 'application/pdf',
      buffer: Buffer.from('%PDF-1.4 mock')
    })
    await expect(page.getByTestId('chat-report-interpret')).toBeVisible({ timeout: 15_000 })
    // Path C 上傳後 mock 會開 goals chips，但 clarifyingGoals 仍空直到確認。
    await expect(page.getByTestId('chat-quiz-option-sleep')).toBeVisible({ timeout: 15_000 })

    const interpretStream = page.waitForRequest((req) => {
      if (req.method() !== 'POST' || !req.url().includes('/messages/stream')) {
        return false
      }
      const data = req.postData() || ''
      return data.includes(interpretNoGoals) && data.includes('"intent":"interpret"')
    })
    await page.getByTestId('chat-report-interpret').click()
    const streamReq = await interpretStream
    const streamBody = JSON.parse(streamReq.postData() || '{}') as {
      content?: string
      intent?: string
    }
    expect(streamBody.content).toBe(interpretNoGoals)
    expect(streamBody.intent).toBe('interpret')
    await expect(page.getByTestId('chat-transcript')).toContainText(interpretNoGoals)
    await expect(page.getByTestId('chat-transcript')).not.toContainText(interpretWithGoals)
  })
})

test.describe('profile quiz gate', () => {
  test.beforeEach(async ({ page }) => {
    // null path → entry a／b／c; tests select B then stream goals (core #133).
    await mockCandorAuth(page, {
      profileQuiz: true,
      asMember: true,
      conversationPath: null
    })
  })

  test('goal chips then profile turn chips; upload via composer only', async ({ page, goto }) => {
    await goto('/', { waitUntil: 'hydration' })
    await page.evaluate(() => localStorage.removeItem('candor.unpaid.journey'))
    await goto('/chat', { waitUntil: 'hydration' })
    // Entry chips use lowercase codes from reply_actions; default mock path=b skips them.
    const entryB = page.getByTestId('chat-quiz-option-b')
    if (await entryB.isVisible().catch(() => false)) {
      await entryB.click()
      await expect(page.getByTestId('chat-quiz-option-c')).toHaveCount(0, { timeout: 15_000 })
    }
    await expect(page.getByTestId('chat-quiz-option-weight_loss')).toBeVisible({ timeout: 15_000 })
    await expect(page.getByTestId('chat-quiz-option-sleep')).toBeVisible()
    await expect(page.getByTestId('chat-chip-upload')).toHaveCount(0)
    await expect(page.getByTestId('chat-upload')).toBeVisible()

    await page.getByTestId('chat-quiz-option-weight_loss').click()
    await page.getByTestId('chat-quiz-option-sleep').click()
    await page.getByTestId('chat-quiz-confirm').click()
    await expect(page.getByTestId('chat-transcript')).toContainText('請問您的生理性別？', { timeout: 15_000 })
    await expect(page.getByTestId('chat-quiz-option-F')).toBeVisible()
    await expect(page.getByTestId('chat-chip-upload')).toHaveCount(0)
    await expect(page.getByTestId('chat-upload')).toBeVisible()

    await page.getByTestId('chat-quiz-option-F').click()
    await expect(page.getByTestId('chat-transcript')).toContainText('女')
    await expect(page.getByTestId('chat-quiz-option-opt_1')).toBeVisible()
    await expect(page.getByTestId('chat-chip-upload')).toHaveCount(0)

    await page.getByTestId('chat-quiz-option-opt_1').click()
    await expect(page.getByTestId('chat-transcript')).toContainText('睡眠')
    await expect(page.getByTestId('chat-chip-upload')).toHaveCount(0)
    await expect(page.getByTestId('chat-upload')).toBeVisible()
  })

  test('chip answer does not autofocus chat input', async ({ page, goto }) => {
    // Irice 2026-10-28: chip／選項答題後不 focus；僅鍵盤 onSubmit 保留。
    await goto('/', { waitUntil: 'hydration' })
    await page.evaluate(() => localStorage.removeItem('candor.unpaid.journey'))
    await goto('/chat', { waitUntil: 'hydration' })
    const entryB = page.getByTestId('chat-quiz-option-b')
    if (await entryB.isVisible().catch(() => false)) {
      await entryB.click()
      await expect(page.getByTestId('chat-quiz-option-c')).toHaveCount(0, { timeout: 15_000 })
    }
    await expect(page.getByTestId('chat-quiz-option-sleep')).toBeVisible({ timeout: 15_000 })
    await page.getByTestId('chat-quiz-option-sleep').click()
    await page.getByTestId('chat-quiz-confirm').click()
    await expect(page.getByTestId('chat-quiz-option-F')).toBeVisible({ timeout: 15_000 })

    await page.getByTestId('chat-quiz-option-F').click()
    await expect(page.getByTestId('chat-transcript')).toContainText('女')
    // Wait past pending／stream settle so any leftover autofocus would have fired.
    await expect(page.getByTestId('chat-quiz-option-opt_1')).toBeVisible({ timeout: 15_000 })
    await expect.poll(async () => {
      return page.evaluate(() => {
        const el = document.activeElement
        if (!el) {
          return null
        }
        const tag = el.tagName.toLowerCase()
        if (tag === 'textarea' || tag === 'input') {
          return el.getAttribute('data-testid') || tag
        }
        return null
      })
    }).toBeNull()
  })
})
