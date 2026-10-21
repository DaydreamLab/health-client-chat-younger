import { expect, test } from '@nuxt/test-utils/playwright'
import { mockCandorAuth } from './mock-candor-auth'

test.beforeEach(async ({ page }) => {
  await mockCandorAuth(page, { asMember: true })
})

const metrics = ['resting_hr', 'steps', 'sleep_minutes'] as const

const locales = [
  {
    code: 'zh',
    prefix: '',
    titles: {
      resting_hr: '靜止心率',
      steps: '步數',
      sleep_minutes: '睡眠'
    }
  },
  {
    code: 'en',
    prefix: '/en',
    titles: {
      resting_hr: 'Resting heart rate',
      steps: 'Steps',
      sleep_minutes: 'Sleep'
    }
  }
] as const

for (const loc of locales) {
  const detailPath = `${loc.prefix}/app/wearables/oura-ring`

  for (const metric of metrics) {
    test(`${loc.code} ?metric=${metric} selects tab and title`, async ({ page, goto }) => {
      await goto(`${detailPath}?metric=${metric}`, { waitUntil: 'hydration' })
      await expect(page.getByTestId('wearables-detail')).toBeVisible()
      await expect(page.getByTestId(`wearables-metric-${metric}`)).toHaveClass(/app-btn-primary/)
      for (const other of metrics.filter(m => m !== metric)) {
        await expect(page.getByTestId(`wearables-metric-${other}`)).toHaveClass(/app-btn-segment/)
      }
      await expect(page.getByRole('heading', { level: 2, name: loc.titles[metric] })).toBeVisible()
      await expect(page).toHaveURL(new RegExp(`metric=${metric}`))
    })
  }

  test(`${loc.code} default (no metric) uses resting_hr`, async ({ page, goto }) => {
    await goto(detailPath, { waitUntil: 'hydration' })
    await expect(page.getByTestId('wearables-detail')).toBeVisible()
    await expect(page.getByTestId('wearables-metric-resting_hr')).toHaveClass(/app-btn-primary/)
    await expect(page.getByTestId('wearables-metric-steps')).toHaveClass(/app-btn-segment/)
    await expect(page.getByTestId('wearables-metric-sleep_minutes')).toHaveClass(/app-btn-segment/)
    await expect(page.getByRole('heading', { level: 2, name: loc.titles.resting_hr })).toBeVisible()
  })

  test(`${loc.code} trailing-slash ?metric=steps selects steps`, async ({ page, goto }) => {
    await goto(`${detailPath}/?metric=steps`, { waitUntil: 'hydration' })
    await expect(page.getByTestId('wearables-detail')).toBeVisible()
    await expect(page.getByTestId('wearables-metric-steps')).toHaveClass(/app-btn-primary/)
    await expect(page.getByTestId('wearables-metric-resting_hr')).toHaveClass(/app-btn-segment/)
    await expect(page.getByRole('heading', { level: 2, name: loc.titles.steps })).toBeVisible()
    await expect(page).toHaveURL(/metric=steps/)
  })

  test(`${loc.code} invalid ?metric= falls back to resting_hr`, async ({ page, goto }) => {
    await goto(`${detailPath}?metric=not_a_metric`, { waitUntil: 'hydration' })
    await expect(page.getByTestId('wearables-detail')).toBeVisible()
    await expect(page.getByTestId('wearables-metric-resting_hr')).toHaveClass(/app-btn-primary/)
    await expect(page.getByTestId('wearables-metric-steps')).toHaveClass(/app-btn-segment/)
    await expect(page.getByRole('heading', { level: 2, name: loc.titles.resting_hr })).toBeVisible()
  })
}
