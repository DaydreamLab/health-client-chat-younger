import { expect, test } from '@nuxt/test-utils/playwright'
import { mockCandorAuth } from './mock-candor-auth'

const labsFile = {
  name: 'labs.pdf',
  mimeType: 'application/pdf',
  buffer: Buffer.from('%PDF-1.4 demo')
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
          data: { items: [], individual_tests_url: 'https://labs.example/tests' }
        })
      })
    })
    await goto('/chat', { waitUntil: 'hydration' })
    await expect(page.getByTestId('chat-report-dock')).toBeVisible()
    await expect(page.getByTestId('chat-report-dock-empty-prompt')).toContainText('若有檢查可以更清楚各項指標')
    await expect(page.getByTestId('chat-report-dock-upload')).toHaveText('上傳報告')
    await expect(page.getByTestId('chat-report-dock-checkup')).toHaveText('前往檢查')
    await expect(page.getByTestId('chat-report-dock-toggle')).toHaveCount(0)
    await expect(page.getByTestId('chat-photo')).toHaveCount(0)
  })

  test('recommendations shows checkout auth gate for guest', async ({ page, goto }) => {
    await goto('/app/recommendations', { waitUntil: 'hydration' })
    await expect(page).toHaveURL(/\/app\/recommendations/)
    await expect(page.getByRole('heading', { name: '推薦方案' })).toBeVisible()
    await expect(page.getByTestId('health-report-empty')).toBeVisible()
    await expect(page.getByTestId('package-plan-basic')).toBeVisible()
    await expect(page.getByTestId('package-plan-advance')).toBeVisible()
    await expect(page.getByTestId('package-rationale')).toBeVisible()
    await expect(page.getByTestId('rationale-group').first()).toBeVisible()
    await expect(page.getByTestId('rationale-entry').first()).toContainText('建議補充')
    await expect(page.getByTestId('rationale-product-badge').first()).toBeVisible()
    await expect(page.getByTestId('checkout-auth-gate')).toBeVisible()
    await expect(page.getByTestId('checkout-login')).toBeVisible()
    await expect(page.getByTestId('checkout-register')).toBeVisible()
  })

  test('guest sees empty orders until a payment', async ({ page, goto }) => {
    await goto('/app/orders', { waitUntil: 'hydration' })
    await page.evaluate(() => localStorage.removeItem('candor-paid-orders'))
    await expect(page.getByRole('heading', { name: '我的訂單' })).toBeVisible()
    await expect(page.getByTestId('nav-orders')).toBeVisible()
    await expect(page.getByTestId('orders-empty')).toBeVisible()
  })
})

test.describe('member order detail', () => {
  test.beforeEach(async ({ page }) => {
    await mockCandorAuth(page, { asMember: true, withOrder: true })
  })

  test('order detail shows catalog image when present', async ({ page, goto }) => {
    await goto('/app/orders/eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', { waitUntil: 'hydration' })
    await expect(page.getByTestId('order-number')).toContainText('ORD-260101-000001')
    await expect(page.getByTestId('order-package-items')).toBeVisible()
    await expect(page.getByTestId('order-item-vitamin_d').getByTestId('order-item-image')).toHaveAttribute(
      'src',
      'https://cdn.example/catalog/vitamin_d.png'
    )
    await expect(page.getByTestId('order-item-kind-vitamin_d')).toHaveText('核心')
    await expect(page.getByTestId('order-item-kind-iron')).toHaveText('功能型')
    await expect(page.getByTestId('order-item-iron').getByTestId('order-item-image')).toHaveCount(0)
  })

  test('health profile shows consultation goal labels in Chinese', async ({ page, goto }) => {
    await goto('/app', { waitUntil: 'hydration' })
    await expect(page.getByRole('heading', { name: '我的健康' })).toBeVisible()
    await expect(page.getByTestId('health-stat-goals')).toContainText('睡眠')
    await expect(page.getByTestId('health-stat-goals')).toContainText('免疫提升')
    await expect(page.getByTestId('health-stat-goals')).not.toContainText('sleep')
    await expect(page.getByTestId('health-stat-goals')).not.toContainText('immune_boost')
  })

  test('report card collapses in place and opens a reading window', async ({ page, goto }) => {
    const reportId = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'
    const results = Array.from({ length: 24 }, (_, index) => ({
      id: `result-e2e-${index}`,
      raw_name: `Marker ${index}`,
      raw_value: String(40 + index),
      value_numeric: 40 + index,
      unit: 'U/L',
      ref_low: 10,
      ref_high: 40,
      critical_high: 60,
      needs_review: false
    }))
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
            }]
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
    const cards = page.getByTestId(`health-report-cards-${reportId}`)
    await expect(card.getByText('報告樣式1')).toBeVisible()
    await expect(card.getByTestId('health-report-view-table')).toHaveAttribute('aria-pressed', 'true')
    await expect(card.getByTestId('health-report-expand')).toHaveText('展開報告')
    await expect(card.getByTestId('health-report-detail')).toBeVisible()
    await expect(card.getByTestId('report-result-row-result-e2e-0')).toBeVisible()

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

    await expect(cards.getByText('報告樣式2')).toBeVisible()
    await expect(cards.getByTestId('health-report-view-table')).toHaveAttribute('aria-pressed', 'true')
    await expect(cards.getByTestId('report-result-strip-result-e2e-0')).toBeVisible()

    const cardMetrics = await card.evaluate((el) => {
      const scroller = el.querySelector('[data-testid="report-result-table"] .scrollbar-none')
      const style = getComputedStyle(el)
      const scrollerStyle = scroller ? getComputedStyle(scroller) : null
      return {
        height: el.getBoundingClientRect().height,
        maxHeight: Number.parseFloat(style.maxHeight),
        scrollHeight: scroller?.scrollHeight ?? 0,
        clientHeight: scroller?.clientHeight ?? 0,
        scrollbarWidth: scrollerStyle?.scrollbarWidth ?? ''
      }
    })
    expect(cardMetrics.maxHeight).toBeGreaterThan(0)
    expect(cardMetrics.height).toBeLessThanOrEqual(cardMetrics.maxHeight + 1)
    expect(cardMetrics.scrollHeight).toBeGreaterThan(cardMetrics.clientHeight)
    expect(cardMetrics.scrollbarWidth).toBe('none')

    await card.getByTestId('health-report-toggle').click()
    await expect(card.getByTestId('health-report-detail')).toHaveCount(0)
    await expect(cards.getByTestId('health-report-detail')).toBeVisible()
    await expect(page.getByRole('dialog')).toHaveCount(0)

    await card.getByRole('button', { name: '展開', exact: true }).click()
    await expect(card.getByTestId('health-report-detail')).toBeVisible()
    await expect(page.getByRole('dialog')).toHaveCount(0)

    await card.getByTestId('health-report-expand').click()
    await expect(card.getByTestId('health-report-detail')).toBeVisible()
    const dialog = page.getByRole('dialog')
    await expect(dialog).toBeVisible()
    await expect(dialog.getByRole('heading', { name: '報告判讀' })).toBeVisible()
    await expect(dialog).not.toContainText('展開報告')
    const sheetToggle = await dialog.getByTestId('health-report-view').boundingBox()
    const sheetClose = await dialog.locator('[data-slot="close"]').boundingBox()
    expect(sheetToggle).not.toBeNull()
    expect(sheetClose).not.toBeNull()
    expect((sheetToggle?.x ?? 0) + (sheetToggle?.width ?? 0)).toBeLessThan(sheetClose?.x ?? 0)
    await expect(dialog.getByTestId('health-report-sheet').getByRole('columnheader')).toHaveText([
      '狀態',
      '項目',
      '數值',
      '單位',
      '參考區間',
      '位置'
    ])
    await expect(dialog.getByText('數值依參考區間著色')).toBeVisible()
    await expect(dialog.getByTestId('report-result-row-result-e2e-0')).toBeVisible()

    const sheetMetrics = await dialog.evaluate(async (el) => {
      await Promise.all(el.getAnimations().map(animation => animation.finished))
      const scroller = el.querySelector('[data-testid="report-result-table"] .scrollbar-none')
      const scrollerStyle = scroller ? getComputedStyle(scroller) : null
      return {
        height: el.getBoundingClientRect().height,
        scrollHeight: scroller?.scrollHeight ?? 0,
        clientHeight: scroller?.clientHeight ?? 0,
        scrollbarWidth: scrollerStyle?.scrollbarWidth ?? ''
      }
    })
    const viewport = page.viewportSize()
    expect(viewport).not.toBeNull()
    const viewportHeight = viewport?.height ?? 0
    expect(sheetMetrics.height).toBeGreaterThan(viewportHeight - 48 - 8)
    expect(sheetMetrics.height).toBeLessThan(viewportHeight - 48 + 8)
    expect(sheetMetrics.scrollHeight).toBeGreaterThan(sheetMetrics.clientHeight)
    expect(sheetMetrics.scrollbarWidth).toBe('none')

    await page.keyboard.press('Escape')
    await expect(dialog).toHaveCount(0)
    await expect(card.getByTestId('health-report-detail')).toBeVisible()

    await cards.getByTestId('health-report-view-cards').click()
    await expect(cards.getByTestId('report-result-card-result-e2e-0')).toBeVisible()
    await expect(cards.getByTestId('report-result-card-position-result-e2e-0')).toBeVisible()
    await expect(cards.getByTestId('report-result-card-status-result-e2e-0')).toHaveText('最佳')
    await expect(cards.getByTestId('report-result-card-status-result-e2e-1')).toHaveText('提醒')
    await expect(cards.getByTestId('report-result-card-status-result-e2e-21')).toHaveText('警戒')
    await expect(card.getByTestId('report-result-row-result-e2e-0')).toBeVisible()

    await cards.getByTestId('health-report-view-table').click()
    await expect(cards.getByTestId('report-result-strip-result-e2e-0')).toBeVisible()
    await expect(cards.getByTestId('report-result-strip-position-result-e2e-0')).toBeVisible()
    await expect(cards.getByTestId('report-result-strip-status-result-e2e-0')).toHaveText('最佳')
    await expect(cards.getByTestId('report-result-row-result-e2e-0')).toHaveCount(0)
    await expect(cards.getByTestId('report-result-card-result-e2e-0')).toHaveCount(0)
    await expect(card.getByTestId('report-result-row-result-e2e-0')).toBeVisible()

    await cards.getByTestId('health-report-view-cards').click()
    await cards.getByTestId('health-report-expand').click()
    await expect(dialog).toBeVisible()
    await expect(dialog).not.toContainText('展開報告')
    await expect(dialog.getByTestId('health-report-view-cards')).toHaveAttribute('aria-pressed', 'true')
    await expect(dialog.getByTestId('report-result-card-result-e2e-0')).toBeVisible()
    await expect(dialog.getByTestId('report-result-card-status-result-e2e-0')).toHaveText('最佳')
    await expect(dialog.getByRole('columnheader')).toHaveCount(0)
    await expect(dialog.getByText('數值依參考區間著色')).toBeVisible()

    await dialog.getByTestId('health-report-view-table').click()
    await expect(dialog.getByTestId('report-result-strip-result-e2e-0')).toBeVisible()
    await expect(dialog.getByRole('columnheader')).toHaveCount(0)
    await expect(cards.getByTestId('report-result-strip-status-result-e2e-1')).toHaveText('提醒')
    await expect(card.getByTestId('report-result-row-result-e2e-0')).toBeVisible()
  })
})

test.describe('login then recommend', () => {
  test.beforeEach(async ({ page }) => {
    await mockCandorAuth(page)
  })

  test('after guest login, view recommend keeps member checkout open', async ({ page, goto }) => {
    test.setTimeout(90_000)
    await page.setViewportSize({ width: 1280, height: 800 })

    await goto('/chat', { waitUntil: 'hydration' })
    await page.evaluate(() => {
      localStorage.removeItem('candor-paid-orders')
      localStorage.removeItem('candor.unpaid.journey')
    })

    await page.getByTestId('chat-upload').click()
    await expect(page).toHaveURL(/\/login/)
    await page.locator('input[type="email"]').fill('guest@example.com')
    await page.locator('input[type="password"]').fill('password1234')
    await page.getByRole('button', { name: '登入' }).click()
    await expect(page).toHaveURL(/\/chat/)

    await page.getByTestId('chat-upload-input').setInputFiles(labsFile)
    await expect(page.getByTestId('chat-report-interpret')).toBeVisible({ timeout: 15_000 })
    await page.getByTestId('chat-report-interpret').click()
    await expect(page.getByTestId('chat-last-reply').getByTestId('chat-view-recommend')).toBeVisible({
      timeout: 15_000
    })
    await page.getByTestId('chat-report-dock-toggle').click()
    await page.getByTestId('chat-view-recommend').click()

    await expect(page).toHaveURL((url) => {
      return url.pathname === '/app/recommendations' || url.pathname === '/app/recommendations/'
    })
    await expect(page.getByTestId('checkout-auth-gate')).toHaveCount(0)
    await expect(page.getByTestId('checkout-total')).toBeVisible({ timeout: 15_000 })
  })
})

test.describe('member checkout', () => {
  test.beforeEach(async ({ page }) => {
    await mockCandorAuth(page, { asMember: true })
  })

  test('empty report dock hides checkup when tests url is empty', async ({ page, goto }) => {
    await page.route('**/api/v1/client-config', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          status: 'success',
          data: { items: [], individual_tests_url: '' }
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
    await goto('/chat', { waitUntil: 'hydration' })
    await page.evaluate(() => localStorage.removeItem('candor.unpaid.journey'))
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
  })

  test('unpaid chat survives refresh via journey storage', async ({ page, goto }) => {
    await goto('/chat', { waitUntil: 'hydration' })
    await page.evaluate(() => {
      localStorage.removeItem('candor-paid-orders')
      localStorage.removeItem('candor.unpaid.journey')
    })
    await page.getByTestId('chat-upload-input').setInputFiles(labsFile)
    await expect(page.getByTestId('chat-report-loading')).toBeVisible()
    await expect(page.getByTestId('chat-report-loading')).toContainText('報告處理中')
    await expect(page.getByTestId('chat-report-interpret')).toBeVisible({ timeout: 15_000 })
    await page.getByTestId('chat-report-interpret').click()
    await expect(page.getByTestId('chat-last-reply').getByTestId('chat-view-recommend')).toBeVisible({ timeout: 15_000 })
    await expect(page.getByTestId('chat-report-loading')).toHaveCount(0)
    await expect(page.getByTestId('chat-report-dock')).toBeVisible()
    await expect(page.getByTestId('chat-report-dock')).toContainText('Vitamin D3')
    await expect(page.getByTestId('chat-escalate')).toBeVisible()
    expect(await page.evaluate(() => localStorage.getItem('candor-paid-orders'))).toBeNull()
    expect(await page.evaluate(() => localStorage.getItem('candor.unpaid.journey'))).toContain('conversationId')

    await page.reload({ waitUntil: 'domcontentloaded' })
    await expect(page.getByRole('heading', { name: '諮詢' })).toBeVisible()
    await expect(page.getByTestId('chat-view-recommend')).toBeVisible()
    await expect(page.getByTestId('chat-input')).toBeVisible()
    await expect(page.getByTestId('chat-chip-plans')).toHaveCount(0)
    await expect(page.getByTestId('chat-escalate')).toBeVisible()
    expect(await page.evaluate(() => localStorage.getItem('candor.unpaid.journey'))).toContain('conversationId')
  })

  test('labs, month package, checkout redirects to sandbox url', async ({ page, goto }) => {
    test.setTimeout(90_000)
    await page.setViewportSize({ width: 1280, height: 800 })

    await goto('/chat', { waitUntil: 'hydration' })
    await page.evaluate(() => localStorage.removeItem('candor-paid-orders'))
    await page.getByTestId('chat-upload-input').setInputFiles(labsFile)
    await expect(page.getByTestId('chat-report-interpret')).toBeVisible({ timeout: 15_000 })
    await page.getByTestId('chat-report-interpret').click()
    await expect(page.getByTestId('chat-last-reply').getByTestId('chat-view-recommend')).toBeVisible({ timeout: 15_000 })
    // Dock covers the transcript CTA at this viewport; collapse so recommend is clickable.
    await page.getByTestId('chat-report-dock-toggle').click()
    await page.getByTestId('chat-view-recommend').click()

    await expect(page.getByTestId('checkout-auth-gate')).toHaveCount(0)
    await expect(page.getByTestId('checkout-total')).toContainText('1,280')
    await expect(page.getByTestId('sellable-item-kind-vitamin_d')).toHaveText('核心')
    await expect(page.getByTestId('sellable-item-kind-iron')).toHaveText('功能型')
    await page.getByTestId('checkout-name').fill('林晏婷')
    await page.getByTestId('checkout-phone').fill('0912345678')
    await page.getByTestId('checkout-address-city').selectOption('台北市')
    await page.getByTestId('checkout-address-district').selectOption('大安區')
    await page.getByTestId('checkout-address').fill('忠孝東路四段1號')

    const pending = page.waitForRequest(request =>
      request.url().includes('/api/v1/orders') && request.method() === 'POST'
    )
    await page.route('https://sandbox.example/**', route => route.fulfill({
      status: 200,
      contentType: 'text/html',
      body: '<!doctype html><title>sandbox</title>'
    }))
    await page.getByTestId('checkout-submit').click()
    const placeReq = await pending
    const body = placeReq.postDataJSON() as {
      invoice_type?: string
      invoice_carrier?: string
      payment_method?: string
    }
    expect(body.payment_method).toBe('card')
    expect(body.invoice_type).toBe('member')
    expect(body.invoice_carrier).toBe('guest@example.com')

    await page.waitForURL(/sandbox\.example\/pay/, { timeout: 10_000 })
  })
})

test.describe('profile quiz gate', () => {
  test.beforeEach(async ({ page }) => {
    await mockCandorAuth(page, { profileQuiz: true, asMember: true })
  })

  test('goal chips then profile turn chips; upload via composer only', async ({ page, goto }) => {
    await goto('/chat', { waitUntil: 'hydration' })
    await page.evaluate(() => localStorage.removeItem('candor.unpaid.journey'))
    await expect(page.getByTestId('chat-last-reply')).toContainText('改善方向')
    await expect(page.getByTestId('chat-quiz-option-weight_loss')).toBeVisible()
    await expect(page.getByTestId('chat-chip-upload')).toHaveCount(0)
    await expect(page.getByTestId('chat-upload')).toBeVisible()

    await page.getByTestId('chat-quiz-option-weight_loss').click()
    await page.getByTestId('chat-quiz-option-sleep').click()
    await page.getByTestId('chat-quiz-confirm').click()
    await expect(page.getByTestId('chat-transcript')).toContainText('請問您的生理性別？')
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
})
