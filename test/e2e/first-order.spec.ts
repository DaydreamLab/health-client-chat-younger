import { expect, test } from '@nuxt/test-utils/playwright'
import { mockCandorAuth } from './mock-candor-auth'

const labsFile = {
  name: 'labs.pdf',
  mimeType: 'application/pdf',
  buffer: Buffer.from('%PDF-1.4 demo')
}

test.describe('guest session', () => {
  test.beforeEach(async ({ page }) => {
    await mockCandorAuth(page)
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

  test('recommendations shows checkout auth gate for guest', async ({ page, goto }) => {
    await goto('/app/recommendations', { waitUntil: 'hydration' })
    await expect(page).toHaveURL(/\/app\/recommendations/)
    await expect(page.getByRole('heading', { name: '推薦方案' })).toBeVisible()
    await expect(page.getByTestId('health-report-empty')).toBeVisible()
    await expect(page.getByTestId('package-plan-basic')).toBeVisible()
    await expect(page.getByTestId('package-plan-advance')).toBeVisible()
    await expect(page.getByTestId('checkout-auth-gate')).toBeVisible()
    await expect(page.getByTestId('checkout-login')).toBeVisible()
    await expect(page.getByTestId('checkout-register')).toBeVisible()
  })

  test('guest sees checkout gate and cannot submit', async ({ page, goto }) => {
    test.setTimeout(90_000)
    await page.setViewportSize({ width: 1280, height: 800 })

    await goto('/chat', { waitUntil: 'hydration' })
    await page.evaluate(() => localStorage.removeItem('candor-paid-orders'))
    await page.getByTestId('chat-upload-input').setInputFiles(labsFile)
    await expect(page.getByTestId('chat-last-reply').getByTestId('chat-view-recommend')).toBeVisible({ timeout: 15_000 })
    await page.getByTestId('chat-view-recommend').click()

    await expect(page.getByTestId('checkout-auth-gate')).toBeVisible()
    await expect(page.getByTestId('checkout-submit')).toBeDisabled()
  })

  test('guest sees empty orders until a payment', async ({ page, goto }) => {
    await goto('/app/orders', { waitUntil: 'hydration' })
    await page.evaluate(() => localStorage.removeItem('candor-paid-orders'))
    await expect(page.getByRole('heading', { name: '我的訂單' })).toBeVisible()
    await expect(page.getByTestId('nav-orders')).toBeVisible()
    await expect(page.getByTestId('orders-empty')).toBeVisible()
  })
})

test.describe('member checkout', () => {
  test.beforeEach(async ({ page }) => {
    await mockCandorAuth(page, { asMember: true })
  })

  test('labs, month package, checkout redirects to sandbox url', async ({ page, goto }) => {
    test.setTimeout(90_000)
    await page.setViewportSize({ width: 1280, height: 800 })

    await goto('/chat', { waitUntil: 'hydration' })
    await page.evaluate(() => localStorage.removeItem('candor-paid-orders'))
    await page.getByTestId('chat-upload-input').setInputFiles(labsFile)
    await expect(page.getByTestId('chat-last-reply').getByTestId('chat-view-recommend')).toBeVisible({ timeout: 15_000 })
    await page.getByTestId('chat-view-recommend').click()

    await expect(page.getByTestId('checkout-auth-gate')).toHaveCount(0)
    await expect(page.getByTestId('checkout-total')).toContainText('1,280')
    await page.getByTestId('checkout-name').fill('林晏婷')
    await page.getByTestId('checkout-phone').fill('0912345678')
    await page.getByTestId('checkout-address').fill('台北市大安區')

    const pending = page.waitForRequest(request =>
      request.url().includes('/api/v1/orders') && request.method() === 'POST'
    )
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
    await mockCandorAuth(page, { profileQuiz: true })
  })

  test('goal chips then profile turn chips then upload chip', async ({ page, goto }) => {
    await goto('/chat', { waitUntil: 'hydration' })
    await page.evaluate(() => localStorage.removeItem('candor.unpaid.journey'))
    await expect(page.getByTestId('chat-last-reply')).toContainText('改善方向')
    await expect(page.getByTestId('chat-quiz-option-vitality')).toBeVisible()
    await expect(page.getByTestId('chat-chip-upload')).toHaveCount(0)

    await page.getByTestId('chat-quiz-option-vitality').click()
    await page.getByTestId('chat-quiz-option-sleep_quality').click()
    await page.getByTestId('chat-quiz-confirm').click()
    await expect(page.getByTestId('chat-transcript')).toContainText('請問您的生理性別？')
    await expect(page.getByTestId('chat-quiz-option-F')).toBeVisible()
    await expect(page.getByTestId('chat-chip-upload')).toBeVisible()

    await page.getByTestId('chat-quiz-option-F').click()
    await expect(page.getByTestId('chat-transcript')).toContainText('女')
    await expect(page.getByTestId('chat-quiz-option-opt_1')).toBeVisible()
    await expect(page.getByTestId('chat-chip-upload')).toBeVisible()

    await page.getByTestId('chat-quiz-option-opt_1').click()
    await expect(page.getByTestId('chat-transcript')).toContainText('睡眠')
    await expect(page.getByTestId('chat-chip-upload')).toBeVisible()
  })
})
