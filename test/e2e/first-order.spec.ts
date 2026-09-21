import { expect, test } from '@nuxt/test-utils/playwright'

const labsFile = {
  name: 'labs.pdf',
  mimeType: 'application/pdf',
  buffer: Buffer.from('%PDF-1.4 demo')
}

test('unpaid chat is gone after refresh and never hits localStorage', async ({ page, goto }) => {
  await goto('/chat', { waitUntil: 'hydration' })
  await page.evaluate(() => localStorage.removeItem('candor-paid-orders'))
  await page.getByTestId('chat-upload-input').setInputFiles(labsFile)
  await expect(page.getByTestId('chat-view-recommend')).toBeVisible()
  expect(await page.evaluate(() => localStorage.getItem('candor-paid-orders'))).toBeNull()

  await page.reload({ waitUntil: 'domcontentloaded' })
  await expect(page.getByRole('heading', { name: '諮詢' })).toBeVisible()
  await expect(page.getByTestId('chat-view-recommend')).toHaveCount(0)
  await expect(page.getByTestId('chat-input')).toBeVisible()
  await expect(page.getByTestId('chat-chip-plans')).toBeVisible()
  await expect(page.getByTestId('chat-escalate')).toBeVisible()
  expect(await page.evaluate(() => localStorage.getItem('candor-paid-orders'))).toBeNull()
})

test('recommend requires login', async ({ page, goto }) => {
  await goto('/app/recommend', { waitUntil: 'hydration' })
  await expect(page).toHaveURL(/\/login/)
  await expect(page.getByRole('heading', { name: '登入後資料才對得到人' })).toBeVisible()
})

test('login, labs, month plan, mock pay, timeline, and readonly chat', async ({ page, goto }) => {
  test.setTimeout(90_000)
  await page.setViewportSize({ width: 1280, height: 800 })

  await goto('/login?redirect=/chat', { waitUntil: 'hydration' })
  await page.evaluate(() => localStorage.removeItem('candor-paid-orders'))
  await page.getByLabel('Email').fill('guest@example.com')
  await page.getByRole('button', { name: '繼續（示範登入）' }).click()
  await expect(page.getByRole('heading', { name: '諮詢' })).toBeVisible()
  await expect(page.getByTestId('member-sidebar')).toHaveAttribute('data-collapsed', 'true')
  await expect(page.getByTestId('nav-sidebar-toggle')).toHaveCount(0)
  await expect(page.getByTestId('member-sidebar').getByTestId('brand')).toHaveText('C')
  await expect(page.getByTestId('nav-chat')).toContainText('諮詢')
  await page.getByTestId('chat-upload-input').setInputFiles(labsFile)
  await expect(page.getByTestId('chat-last-reply')).toContainText('基礎保養')
  await page.getByTestId('chat-view-recommend').click()

  await expect(page.getByRole('heading', { name: '推薦方案' })).toBeVisible()
  await expect(page.getByTestId('shop-plan-basicCare')).toBeVisible()
  await expect(page.getByTestId('shop-plan-fullTune')).toBeVisible()
  await expect(page.locator('input[type="number"]')).toHaveCount(0)
  await expect(page.getByRole('button', { name: '刪除' })).toHaveCount(0)
  await expect(page.getByTestId('shop-dose-vitaminD')).toContainText('1')
  await page.getByTestId('shop-item-vitaminD').click()
  await expect(page.getByTestId('supplement-detail')).toBeVisible()
  await page.getByRole('button', { name: '關閉' }).click()
  await expect(page.getByTestId('supplement-detail')).toHaveCount(0)

  await page.getByTestId('shop-plan-basicCare').click()
  await expect(page.getByTestId('checkout-total')).toContainText('1,280')
  await page.getByTestId('checkout-name').fill('林晏婷')
  await page.getByTestId('checkout-phone').fill('0912345678')
  await page.getByTestId('checkout-address').fill('台北市大安區')
  await page.getByTestId('checkout-submit').click()
  await expect(page).toHaveURL(/\/app\/orders\//, { timeout: 20_000 })
  await expect(page.getByTestId('order-number')).toBeVisible({ timeout: 15_000 })
  await expect(page.getByTestId('timeline-confirmed')).toContainText('訂單確認中')
  await expect(page.getByTestId('timeline-picking')).toContainText('理貨')
  await expect(page.getByTestId('timeline-shipped')).toContainText('出貨')
  await expect(page.getByTestId('timeline-delivered')).toContainText('已送達')
  const paid = await page.evaluate(() => localStorage.getItem('candor-paid-orders'))
  expect(paid).toContain('"planId":"basicCare"')

  await page.getByTestId('nav-orders').click()
  await expect(page.getByRole('heading', { name: '我的訂單' })).toBeVisible()
  await expect(page.getByTestId('orders-empty')).toHaveCount(0)
  await expect(page.getByTestId('order-status')).toHaveText('訂單確認中')
  await expect(page.getByTestId('order-items')).toContainText('維生素 D')
  await expect(page.getByTestId('order-item-iron')).toBeVisible()
  await expect(page.getByTestId('order-item-vitaminC')).toBeVisible()
  await expect(page.getByText('基礎保養').first()).toBeVisible()
  await expect(page.getByText('NT$1,280').first()).toBeVisible()

  await page.locator('[data-testid^="order-chat-"]').click()
  await expect(page.getByTestId('chat-readonly')).toBeVisible()
  await expect(page.getByTestId('chat-input')).toHaveCount(0)
  await expect(page.getByTestId('chat-upload')).toHaveCount(0)
  await expect(page.getByTestId('chat-escalate')).toHaveCount(0)
  await expect(page.getByTestId('chat-chip-plans')).toHaveCount(0)
  await expect(page.getByTestId('chat-view-recommend')).toHaveCount(0)
  await expect(page.getByTestId('chat-transcript')).toContainText('labs.pdf')
})

test('logged-in member sees empty orders until a payment', async ({ page, goto }) => {
  await goto('/login?redirect=/app/orders', { waitUntil: 'hydration' })
  await page.evaluate(() => localStorage.removeItem('candor-paid-orders'))
  await page.getByLabel('Email').fill('guest@example.com')
  await page.getByRole('button', { name: '繼續（示範登入）' }).click()
  await expect(page.getByRole('heading', { name: '我的訂單' })).toBeVisible()
  await expect(page.getByTestId('nav-orders')).toBeVisible()
  await expect(page.getByTestId('orders-empty')).toContainText('未付款的對話不會留下紀錄')
})
