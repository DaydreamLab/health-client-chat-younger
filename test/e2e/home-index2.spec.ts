import { expect, test } from '@nuxt/test-utils/playwright'
import { mockCandorAuth } from './mock-candor-auth'

test.beforeEach(async ({ page }) => {
  await mockCandorAuth(page)
})

test('index2 books Younger advisor, drops goals, sets noindex; home unchanged', async ({ page, goto }) => {
  await goto('/index2', { waitUntil: 'hydration' })

  await expect(page.getByTestId('index2-page')).toBeVisible()
  await expect(page.getByTestId('home-goals')).toHaveCount(0)
  await expect(page.getByRole('heading', { name: '你想先改善哪裡' })).toHaveCount(0)
  await expect(page.getByRole('heading', { name: '選一種方式開始' })).toBeVisible()
  await expect(page.getByRole('heading', { name: '看懂你的狀態' })).toBeVisible()
  await expect(page.getByRole('heading', { name: '取得推薦方案' })).toBeVisible()

  const robots = page.locator('meta[name="robots"]')
  await expect(robots).toHaveAttribute('content', /noindex/i)

  const description = page.locator('meta[name="description"]')
  await expect(description).toHaveAttribute('content', /取得專屬保健品組合/)
  await expect(description).not.toHaveAttribute('content', /轉專人客服/)

  await expect(page.getByTestId('hero-cta-chat')).toHaveAttribute('href', /\/chat\/?$/)
  await expect(page.getByTestId('hero-cta-upload')).toHaveCount(0)
  await expect(page.getByTestId('package-advisor-booking')).toBeVisible()
  await expect(page.getByTestId('package-advisor-booking')).toHaveAttribute('href', /\/expert-booking\/?$/)
  await expect(page.getByTestId('index2-pricing-plans')).not.toContainText('Younger 顧問一對一檢視你的健康資料')

  await page.setViewportSize({ width: 1280, height: 900 })
  const billing = page.locator('[data-testid="index2-pricing-plans"] [data-slot="billingCycle"]')
  await expect(billing.first()).toBeVisible()
  await expect(billing.first()).toHaveText(/／30 天份/)
  const billingBox = await billing.first().boundingBox()
  expect(billingBox?.width ?? 0).toBeGreaterThan(24)

  await expect(page.getByTestId('index2-disclaimer')).toContainText('不提供醫療診斷')
  await expect(page.getByTestId('index2-footer')).toBeVisible()
  await expect(page.getByText('service@candor.example')).toHaveCount(0)
  await expect(page.getByLabel('Instagram')).toHaveCount(0)

  await goto('/', { waitUntil: 'hydration' })
  await expect(page.getByTestId('home-goals')).toBeVisible()
  await expect(page.getByRole('heading', { name: '你想先改善哪裡' })).toBeVisible()
  await expect(page.getByTestId('package-advisor-booking')).toHaveCount(0)
  await expect(page.locator('meta[name="robots"]')).toHaveCount(0)
  await expect(page.getByText('service@candor.example')).toBeVisible()
})

test('EN index2 advisor card links to /en/expert-booking', async ({ page, goto }) => {
  await goto('/en/index2', { waitUntil: 'hydration' })

  await expect(page.getByTestId('index2-page')).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Pick a way to start' })).toBeVisible()
  await expect(page.getByTestId('home-goals')).toHaveCount(0)
  await expect(page.getByTestId('package-advisor-booking')).toHaveAttribute('href', /\/en\/expert-booking\/?$/)
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/i)
  await expect(page.getByTestId('index2-disclaimer')).toContainText('not a medical diagnosis')
})
