import { expect, test } from '@nuxt/test-utils/playwright'
import { mockCandorAuth } from './mock-candor-auth'

test.beforeEach(async ({ page }) => {
  await mockCandorAuth(page, { asMember: true })
})

test('wearables detail chart uses English weekdays and units', async ({ page, goto }) => {
  await goto('/en/app/wearables/apple-watch?metric=sleep_minutes', { waitUntil: 'hydration' })
  await expect(page.getByTestId('wearables-metric-sleep_minutes')).toHaveClass(/app-btn-primary/)
  const chart = page.locator('[role="img"][aria-label="Sleep"]')
  await expect(chart).toContainText('Mon')
  await expect(chart).not.toContainText('一')
  await expect(chart).toContainText('6h 30m')
  await expect(chart).toContainText('7h')
  await expect(chart).not.toContainText('7h 0m')
  await page.getByTestId('wearables-range-30').click()
  await expect(chart).not.toContainText('6h 30m')
  await expect(page.getByTestId('wearables-chart-unit')).toHaveText('h')
  await expect(page.getByTestId('wearables-metric-steps')).toHaveClass(/app-btn-segment/)
  await expect(page.getByTestId('wearables-metric-sleep_minutes')).toHaveClass(/app-btn-primary/)
})

test('wearables detail chart uses zh weekdays and units', async ({ page, goto }) => {
  await goto('/app/wearables/apple-watch?metric=resting_hr', { waitUntil: 'hydration' })
  await expect(page.getByTestId('wearables-metric-resting_hr')).toHaveClass(/app-btn-primary/)
  const chart = page.locator('[role="img"][aria-label="靜止心率"]')
  await expect(chart).not.toContainText('Mon')
  await expect(chart).toContainText('次/分')
})

test('30-day chart thins X-axis labels and shows chart unit (en)', async ({ page, goto }) => {
  await goto('/en/app/wearables/apple-watch?metric=steps', { waitUntil: 'hydration' })
  await page.getByTestId('wearables-range-30').click()
  const chart = page.getByTestId('wearables-trend-chart')
  await expect(page.getByTestId('wearables-chart-unit')).toHaveText('steps')
  const dayLabels = await chart.evaluate((svg) => {
    const axisY = svg.viewBox.baseVal.height - 24
    return Array.from(svg.querySelectorAll('text'))
      .filter((el) => {
        const y = Number(el.getAttribute('y'))
        const text = (el.textContent ?? '').trim()
        return y >= axisY && /^\d+$/.test(text)
      })
      .map(el => Number((el.textContent ?? '').trim()))
      .sort((a, b) => a - b)
  })
  expect(dayLabels).toEqual([1, 5, 10, 15, 20, 25, 30])
})

test('30-day chart thins X-axis labels and shows chart unit (zh)', async ({ page, goto }) => {
  await goto('/app/wearables/apple-watch?metric=steps', { waitUntil: 'hydration' })
  await page.getByTestId('wearables-range-30').click()
  await expect(page.getByTestId('wearables-chart-unit')).toHaveText('步')
  const chart = page.getByTestId('wearables-trend-chart')
  const dayLabels = await chart.evaluate((svg) => {
    const axisY = svg.viewBox.baseVal.height - 24
    return Array.from(svg.querySelectorAll('text'))
      .filter((el) => {
        const y = Number(el.getAttribute('y'))
        const text = (el.textContent ?? '').trim()
        return y >= axisY && /^\d+$/.test(text)
      })
      .map(el => Number((el.textContent ?? '').trim()))
      .sort((a, b) => a - b)
  })
  expect(dayLabels).toEqual([1, 5, 10, 15, 20, 25, 30])
})
