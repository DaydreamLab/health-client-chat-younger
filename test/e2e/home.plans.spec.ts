import { expect, test } from '@nuxt/test-utils/playwright'
import { mockCandorAuth } from './mock-candor-auth'

// Legacy pre-catalog package-plans shape tests removed: product path uses catalog
// fields (original_price / features / badge). i18n description fallback stays covered
// by description-en-null below.

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

test('EN subtitles use description_en when API provides it', async ({ page, goto }) => {
  await mockCandorAuth(page, { packagePlans: 'description-en' })
  await goto('/en/', { waitUntil: 'hydration' })

  const plans = page.locator('#plans')
  await expect(plans.getByText('E2E API basic description_en')).toBeVisible()
  await expect(plans.getByText('E2E API advance description_en')).toBeVisible()
  await expect(plans.getByText('對應異常指標的基礎補充')).toHaveCount(0)
})

test('EN subtitles fall back to i18n when description_en is null', async ({ page, goto }) => {
  await mockCandorAuth(page, { packagePlans: 'description-en-null' })
  await goto('/en/', { waitUntil: 'hydration' })

  const plans = page.locator('#plans')
  await expect(plans.getByText('Base supplements for out-of-range markers').first()).toBeVisible()
  await expect(plans.getByText('Basic Care plus strengthening add-ons')).toBeVisible()
  await expect(plans.getByText('對應異常指標的基礎補充')).toHaveCount(0)
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
