import { expect, test } from '@nuxt/test-utils/playwright'
import { mockCandorAuth } from './mock-candor-auth'

test.beforeEach(async ({ page }) => {
  await mockCandorAuth(page, { asMember: true })
})

test('direct /en/ wearables detail uses Candor document title', async ({ page, goto }) => {
  await goto('/en/app/wearables/apple-watch?metric=steps', { waitUntil: 'hydration' })
  await expect(page.getByTestId('wearables-detail')).toBeVisible()
  await expect(page).toHaveTitle('Candor')
  await expect(page.locator('html')).toHaveAttribute('lang', 'en')
})

test('switching zh → en updates document title to Candor on Apple Watch detail', async ({ page, goto }) => {
  await goto('/app/wearables/apple-watch?metric=steps', { waitUntil: 'hydration' })
  await expect(page).toHaveTitle('坦見')
  await expect(page.locator('html')).toHaveAttribute('lang', 'zh-TW')

  await page.getByRole('button', { name: '語言：繁中' }).first().click()
  await expect(page).toHaveURL(/\/en\/app\/wearables\/apple-watch/)
  await expect(page.getByTestId('wearables-detail')).toBeVisible()
  await expect(page).toHaveTitle('Candor')
  await expect(page.locator('html')).toHaveAttribute('lang', 'en')
})

test('switching en → zh updates document title to 坦見', async ({ page, goto }) => {
  await goto('/en/app/wearables/apple-watch', { waitUntil: 'hydration' })
  await expect(page).toHaveTitle('Candor')

  await page.getByRole('button', { name: 'Language: EN' }).first().click()
  await expect(page).toHaveURL(/\/app\/wearables\/apple-watch/)
  await expect(page).toHaveTitle('坦見')
  await expect(page.locator('html')).toHaveAttribute('lang', 'zh-TW')
})
