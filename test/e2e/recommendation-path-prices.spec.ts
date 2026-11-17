import { expect, test } from '@nuxt/test-utils/playwright'
import { mockCandorAuth } from './mock-candor-auth'

/**
 * /app/recommendations path-choice cards:
 * - AI: hardcoded title／body; price = min GET /package-plans[].price →「NT$X 起」
 * - Expert: hardcoded「專家解析方案」／描述; price = min GET /expert-plans[].price
 * Hide price row when catalog empty or request fails.
 */
test.describe('recommendation path prices', () => {
  test('shows dynamic from-prices for AI and expert cards', async ({ page, goto }) => {
    await mockCandorAuth(page, {
      asMember: true,
      expertPlansCatalog: 'default',
      packagePlans: 'legacy'
    })
    await goto('/app/recommendations', { waitUntil: 'hydration' })

    const ai = page.getByTestId('recommendation-path-ai')
    const expert = page.getByTestId('recommendation-path-expert')
    await expect(ai).toBeVisible()
    await expect(expert).toBeVisible()

    await expect(ai).toContainText('AI 建議方案')
    await expect(ai).toContainText('依您的問卷與報告，由 AI 搭配保健品方案，可自行更換')
    // legacy mock min package plan price = 5000
    await expect(page.getByTestId('recommendation-path-ai-price')).toHaveText('NT$5,000 起')

    await expect(expert).toContainText('專家解析方案')
    await expect(expert).toContainText('由專家判讀您的報告與健康資料，提供專屬保健品方案')
    await expect(expert).not.toContainText('專家預約')
    // default expert catalog min = 6000
    await expect(page.getByTestId('recommendation-path-expert-price')).toHaveText('NT$6,000 起')
  })

  test('hides price rows when catalogs are empty', async ({ page, goto }) => {
    await mockCandorAuth(page, {
      asMember: true,
      expertPlansCatalog: 'empty',
      packagePlans: 'empty'
    })
    await goto('/app/recommendations', { waitUntil: 'hydration' })

    const ai = page.getByTestId('recommendation-path-ai')
    const expert = page.getByTestId('recommendation-path-expert')
    await expect(ai).toBeVisible()
    await expect(expert).toBeVisible()
    await expect(ai).toContainText('AI 建議方案')
    await expect(expert).toContainText('專家解析方案')
    await expect(page.getByTestId('recommendation-path-ai-price')).toHaveCount(0)
    await expect(page.getByTestId('recommendation-path-expert-price')).toHaveCount(0)
  })

  test('hides price rows when catalog GETs fail', async ({ page, goto }) => {
    await mockCandorAuth(page, { asMember: true })
    await page.route('**/api/v1/package-plans', async (route) => {
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
    await page.route('**/api/v1/expert-plans', async (route) => {
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

    await expect(page.getByTestId('recommendation-path-ai')).toBeVisible()
    await expect(page.getByTestId('recommendation-path-expert')).toBeVisible()
    await expect(page.getByTestId('recommendation-path-ai-price')).toHaveCount(0)
    await expect(page.getByTestId('recommendation-path-expert-price')).toHaveCount(0)
  })
})
