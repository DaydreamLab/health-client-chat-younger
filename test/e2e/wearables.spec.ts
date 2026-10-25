import { expect, test } from '@nuxt/test-utils/playwright'
import { mockCandorAuth } from './mock-candor-auth'

test.beforeEach(async ({ page }) => {
  await mockCandorAuth(page, { asMember: true })
})

test('wearables list shows sample devices and statuses', async ({ page, goto }) => {
  await goto('/app/wearables', { waitUntil: 'hydration' })

  await expect(page.getByTestId('wearables-page')).toBeVisible()
  await expect(page.getByTestId('wearables-coming-soon').first()).toBeVisible()
  await expect(page.getByTestId('wearables-coming-soon').first()).toHaveText('即將上線')
  await expect(page.getByTestId('wearables-coming-soon-hint')).toBeVisible()
  await expect(page.getByTestId('wearables-coming-soon-hint')).toContainText('介面預覽用的範例資料')
  await expect(page.getByTestId('wearables-sample-badge')).toHaveCount(0)
  await expect(page.getByTestId('wearables-sample-chip').first()).toBeVisible()
  await expect(page.getByTestId('wearables-sample-chip').first()).toHaveText('範例')
  await expect(page.getByTestId('wearables-device-list')).toBeVisible()
  await expect(page.getByTestId('wearables-device-apple-watch')).toBeVisible()
  await expect(page.getByTestId('wearables-status-connected')).toBeVisible()
  await expect(page.getByTestId('wearables-status-delayed')).toBeVisible()
  await expect(page.getByTestId('wearables-status-auth_expired')).toBeVisible()
  await expect(page.getByTestId('wearables-status-auth_expired')).toHaveClass(/app-badge-error/)
  await expect(page.getByTestId('wearables-demo-nav')).toBeVisible()
  await expect(page.getByTestId('wearables-demo-nav').locator('summary')).toContainText('預覽狀態')
})

test('wearables detail supports 7/30 day range and averages', async ({ page, goto }) => {
  await goto('/app/wearables/apple-watch', { waitUntil: 'hydration' })

  await expect(page.getByTestId('wearables-detail')).toBeVisible()
  await expect(page.getByTestId('wearables-coming-soon-hint')).toBeVisible()
  await expect(page.getByTestId('wearables-sample-badge')).toBeVisible()
  await expect(page.getByTestId('wearables-sample-badge')).toHaveText('範例資料')
  await expect(page.getByTestId('wearables-metric-average')).toContainText('62')
  await expect(page.getByTestId('wearables-secondary-averages')).toContainText('7,820')
  await expect(page.getByTestId('wearables-secondary-averages')).not.toContainText('（範例）')

  await page.getByTestId('wearables-range-30').click()
  await expect(page.getByTestId('wearables-metric-average')).toContainText('63')

  await page.getByTestId('wearables-metric-steps').click()
  await expect(page.getByTestId('wearables-metric-average')).toContainText('7,650')
})

test('wearables demo query switches empty and error states', async ({ page, goto }) => {
  await goto('/app/wearables?demo=empty', { waitUntil: 'hydration' })
  await expect(page.getByTestId('wearables-empty')).toBeVisible()

  await goto('/app/wearables?demo=no_data', { waitUntil: 'hydration' })
  await expect(page.getByTestId('wearables-no-data')).toBeVisible()

  await goto('/app/wearables?demo=errors', { waitUntil: 'hydration' })
  await expect(page.getByTestId('wearables-error-auth')).toBeVisible()
  await expect(page.getByTestId('wearables-error-sync')).toBeVisible()
})

test('health report shows wearables reference entry with query flag', async ({ page, goto }) => {
  await goto('/app?wearables_report=demo', { waitUntil: 'hydration' })
  await expect(page.getByTestId('wearables-report-reference')).toBeVisible()
  await expect(page.getByTestId('wearables-report-ref-sleep')).toBeVisible()
  await expect(page.getByTestId('wearables-report-ref-hr')).toContainText('62')
})
