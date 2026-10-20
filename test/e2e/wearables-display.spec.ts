import { expect, test } from '@nuxt/test-utils/playwright'
import { mockCandorAuth } from './mock-candor-auth'

test.beforeEach(async ({ page }) => {
  await mockCandorAuth(page, { asMember: true })
})

test('wearables detail chart uses English weekdays and units', async ({ page, goto }) => {
  await goto('/en/app/wearables/apple-watch', { waitUntil: 'hydration' })
  await page.getByTestId('wearables-metric-sleep_minutes').click()
  const chart = page.locator('[role="img"][aria-label="Sleep"]')
  await expect(chart).toContainText('Mon')
  await expect(chart).not.toContainText('一')
  await expect(chart).toContainText('6h 30m')
  await expect(chart).toContainText('7h')
  await expect(chart).not.toContainText('7h 0m')
  await page.getByTestId('wearables-range-30').click()
  await expect(chart).not.toContainText('6h 30m')
  await expect(page.getByTestId('wearables-metric-steps')).toHaveClass(/app-btn-segment/)
  await expect(page.getByTestId('wearables-metric-sleep_minutes')).toHaveClass(/app-btn-primary/)
})

test('wearables detail chart uses zh weekdays and units', async ({ page, goto }) => {
  await goto('/app/wearables/apple-watch', { waitUntil: 'hydration' })
  await page.getByTestId('wearables-metric-resting_hr').click()
  const chart = page.locator('[role="img"][aria-label="靜止心率"]')
  await expect(chart).not.toContainText('Mon')
  await expect(chart).toContainText('次/分')
})
