import type { Page } from '@playwright/test'
import { expect, test } from '@nuxt/test-utils/playwright'
import { mockCandorAuth } from './mock-candor-auth'

async function seedJourneyConversation(page: Page) {
  await page.addInitScript(() => {
    localStorage.setItem('candor.unpaid.journey', JSON.stringify({
      conversationId: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
      messages: [],
      reportId: null
    }))
  })
}

test('EN checkout city options show English labels with Chinese values', async ({ page, goto }) => {
  await mockCandorAuth(page, {
    asMember: true,
    expertReview: 'none',
    expertPlansCatalog: 'single'
  })
  await seedJourneyConversation(page)
  await goto('/en/app/checkout?kind=expert_plan', { waitUntil: 'hydration' })
  await expect(page.getByTestId('checkout-address-city')).toBeVisible({ timeout: 25_000 })

  const city = page.getByTestId('checkout-address-city')
  await expect(city.locator('option[value="台北市"]')).toHaveText('Taipei City')
  await expect(city.locator('option[value="連江縣"]')).toHaveText('Lienchiang County')
  await expect(city.locator('option[value="新北市"]')).toHaveText('New Taipei City')
  await expect(city.locator('option')).toHaveCount(23)

  await city.selectOption({ value: '台北市' })
  await expect(city).toHaveValue('台北市')
})

test('zh-TW checkout city options stay Chinese', async ({ page, goto }) => {
  await mockCandorAuth(page, {
    asMember: true,
    expertReview: 'none',
    expertPlansCatalog: 'single'
  })
  await seedJourneyConversation(page)
  await goto('/app/checkout?kind=expert_plan', { waitUntil: 'hydration' })
  await expect(page.getByTestId('checkout-address-city')).toBeVisible({ timeout: 25_000 })

  const city = page.getByTestId('checkout-address-city')
  await expect(city.locator('option[value="台北市"]')).toHaveText('台北市')
  await expect(city.locator('option[value="連江縣"]')).toHaveText('連江縣')
})
