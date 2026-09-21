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
  expect(await page.evaluate(() => localStorage.getItem('candor-paid-orders'))).toBeNull()
})

test('login, labs, month plan, mock pay, timeline, and readonly chat', async ({ page, goto }) => {
  test.setTimeout(90_000)
  await page.setViewportSize({ width: 1280, height: 800 })

  await goto('/login?redirect=/chat', { waitUntil: 'hydration' })
  await page.evaluate(() => localStorage.removeItem('candor-paid-orders'))
  await page.getByLabel('Email').fill('guest@example.com')
  await page.getByRole('button', { name: '繼續（示範登入）' }).click()
  await expect(page.getByRole('heading', { name: '諮詢' })).toBeVisible()
  await expect(page.getByTestId('nav-chat')).toBeVisible()
  await page.getByTestId('chat-upload-input').setInputFiles(labsFile)
  await expect(page.getByTestId('chat-last-reply')).toContainText('基礎保養')
  await page.getByTestId('chat-view-recommend').click()

  await expect(page.getByRole('heading', { name: '一個月保健方案' })).toBeVisible()
  await expect(page.getByTestId('lab-bar-chart')).toBeVisible()
  await expect(page.getByTestId('shop-plan-basicCare')).toBeVisible()
  await expect(page.getByTestId('shop-plan-fullTune')).toBeVisible()
  await expect(page.locator('input[type="number"]')).toHaveCount(0)
  await expect(page.getByRole('button', { name: '刪除' })).toHaveCount(0)
  await expect(page.getByTestId('shop-dose-vitaminD')).toHaveText('1')

  await page.getByTestId('shop-plan-basicCare').click()
  await expect(page.getByTestId('checkout-total')).toContainText('1,280')
  await page.getByTestId('checkout-name').fill('林晏婷')
  await page.getByTestId('checkout-phone').fill('0912345678')
  await page.getByTestId('checkout-address').fill('台北市大安區')
  await page.getByTestId('checkout-submit').click()

  await expect(page.getByTestId('order-number')).toBeVisible()
  await expect(page.getByTestId('timeline-confirmed')).toBeVisible()
  await expect(page.getByTestId('timeline-picking')).toBeVisible()
  await expect(page.getByTestId('timeline-shipped')).toBeVisible()
  await expect(page.getByTestId('timeline-delivered')).toBeVisible()
  const paid = await page.evaluate(() => localStorage.getItem('candor-paid-orders'))
  expect(paid).toContain('"planId":"basicCare"')

  await page.getByTestId('order-view-chat').click()
  await expect(page.getByTestId('chat-readonly')).toBeVisible()
  await expect(page.getByTestId('chat-input')).toHaveCount(0)
  await expect(page.getByTestId('chat-upload')).toHaveCount(0)
  await expect(page.getByTestId('chat-transcript')).toContainText('labs.pdf')
})
