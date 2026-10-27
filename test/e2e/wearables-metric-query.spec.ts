import { expect, test } from '@nuxt/test-utils/playwright'
import { mockCandorAuth } from './mock-candor-auth'

test.beforeEach(async ({ page }) => {
  await mockCandorAuth(page, { asMember: true })
})

// Converged from 12 → 5: bilingual smoke without mirroring every branch.
test('zh ?metric=steps selects tab and title', async ({ page, goto }) => {
  await goto('/app/wearables/oura-ring?metric=steps', { waitUntil: 'hydration' })
  await expect(page.getByTestId('wearables-detail')).toBeVisible()
  await expect(page.getByTestId('wearables-metric-steps')).toHaveClass(/app-btn-primary/)
  await expect(page.getByTestId('wearables-metric-resting_hr')).toHaveClass(/app-btn-segment/)
  await expect(page.getByTestId('wearables-metric-sleep_minutes')).toHaveClass(/app-btn-segment/)
  await expect(page.getByRole('heading', { level: 2, name: '步數' })).toBeVisible()
  await expect(page).toHaveURL(/metric=steps/)
})

test('en ?metric=resting_hr selects tab and title', async ({ page, goto }) => {
  await goto('/en/app/wearables/oura-ring?metric=resting_hr', { waitUntil: 'hydration' })
  await expect(page.getByTestId('wearables-detail')).toBeVisible()
  await expect(page.getByTestId('wearables-metric-resting_hr')).toHaveClass(/app-btn-primary/)
  await expect(page.getByTestId('wearables-metric-steps')).toHaveClass(/app-btn-segment/)
  await expect(page.getByTestId('wearables-metric-sleep_minutes')).toHaveClass(/app-btn-segment/)
  await expect(page.getByRole('heading', { level: 2, name: 'Resting heart rate' })).toBeVisible()
  await expect(page).toHaveURL(/metric=resting_hr/)
})

test('zh default (no metric) uses resting_hr', async ({ page, goto }) => {
  await goto('/app/wearables/oura-ring', { waitUntil: 'hydration' })
  await expect(page.getByTestId('wearables-detail')).toBeVisible()
  await expect(page.getByTestId('wearables-metric-resting_hr')).toHaveClass(/app-btn-primary/)
  await expect(page.getByTestId('wearables-metric-steps')).toHaveClass(/app-btn-segment/)
  await expect(page.getByTestId('wearables-metric-sleep_minutes')).toHaveClass(/app-btn-segment/)
  await expect(page.getByRole('heading', { level: 2, name: '靜止心率' })).toBeVisible()
})

test('en trailing-slash ?metric=steps selects steps', async ({ page, goto }) => {
  await goto('/en/app/wearables/oura-ring/?metric=steps', { waitUntil: 'hydration' })
  await expect(page.getByTestId('wearables-detail')).toBeVisible()
  await expect(page.getByTestId('wearables-metric-steps')).toHaveClass(/app-btn-primary/)
  await expect(page.getByTestId('wearables-metric-resting_hr')).toHaveClass(/app-btn-segment/)
  await expect(page.getByRole('heading', { level: 2, name: 'Steps' })).toBeVisible()
  await expect(page).toHaveURL(/metric=steps/)
})

test('en invalid ?metric= falls back to resting_hr', async ({ page, goto }) => {
  await goto('/en/app/wearables/oura-ring?metric=not_a_metric', { waitUntil: 'hydration' })
  await expect(page.getByTestId('wearables-detail')).toBeVisible()
  await expect(page.getByTestId('wearables-metric-resting_hr')).toHaveClass(/app-btn-primary/)
  await expect(page.getByTestId('wearables-metric-steps')).toHaveClass(/app-btn-segment/)
  await expect(page.getByRole('heading', { level: 2, name: 'Resting heart rate' })).toBeVisible()
})
