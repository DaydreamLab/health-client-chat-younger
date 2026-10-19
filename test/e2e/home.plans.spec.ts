import { expect, test } from '@nuxt/test-utils/playwright'
import { mockCandorAuth } from './mock-candor-auth'

test('legacy package-plans API keeps i18n features and last-plan highlight', async ({ page, goto }) => {
  await mockCandorAuth(page, { packagePlans: 'legacy' })
  await goto('/', { waitUntil: 'hydration' })

  const plans = page.locator('#plans')
  await expect(plans.getByText('NT$5,000')).toBeVisible()
  await expect(plans.getByText('NT$9,000')).toBeVisible()
  await expect(plans.getByText('NT$8,000')).toHaveCount(0)
  await expect(plans.getByText('NT$12,000')).toHaveCount(0)
  await expect(plans.getByText('對談或上傳血檢後組成品項').first()).toBeVisible()
  await expect(plans.getByText('含基礎保養的全部項目')).toBeVisible()
  await expect(plans.getByText('推薦', { exact: true })).toBeVisible()
})

test('catalog package-plans API drives strikethrough, features, and badges', async ({ page, goto }) => {
  await mockCandorAuth(page, { packagePlans: 'catalog' })
  await goto('/', { waitUntil: 'hydration' })

  const plans = page.locator('#plans')
  await expect(plans.getByText('NT$8,000')).toBeVisible()
  await expect(plans.getByText('NT$5,000')).toBeVisible()
  await expect(plans.getByText('NT$12,000')).toBeVisible()
  await expect(plans.getByText('NT$9,000')).toBeVisible()
  await expect(plans.getByText('API 基礎功能一')).toBeVisible()
  await expect(plans.getByText('API 進階功能一')).toBeVisible()
  await expect(plans.getByText('含基礎保養的全部項目')).toHaveCount(0)
  await expect(plans.getByText('推薦', { exact: true })).toBeVisible()
  await expect(plans.getByText('API 基礎功能二')).toBeVisible()
})

test('EN locale plan subtitles use English without Chinese API descriptions', async ({ page, goto }) => {
  await mockCandorAuth(page, { packagePlans: 'legacy' })
  await goto('/en/', { waitUntil: 'hydration' })

  const plans = page.locator('#plans')
  await expect(plans.getByText('對應異常指標的基礎補充')).toHaveCount(0)
  await expect(plans.getByText('基礎保養＋加強項目')).toHaveCount(0)
  await expect(plans.getByText('Base supplements for out-of-range markers').first()).toBeVisible()
  await expect(plans.getByText('Basic Care plus strengthening add-ons')).toBeVisible()
})

test('catalog API skips strikethrough when original_price is null or equals price', async ({ page, goto }) => {
  await mockCandorAuth(page, { packagePlans: 'no-strikethrough' })
  await goto('/', { waitUntil: 'hydration' })

  const plans = page.locator('#plans')
  await expect(plans.getByText('NT$5,000')).toBeVisible()
  await expect(plans.getByText('NT$9,000')).toBeVisible()
  await expect(plans.getByText('NT$8,000')).toHaveCount(0)
  await expect(plans.getByText('NT$12,000')).toHaveCount(0)
})
