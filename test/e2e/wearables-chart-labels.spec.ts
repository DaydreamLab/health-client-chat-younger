import { expect, test } from '@nuxt/test-utils/playwright'
import { mockCandorAuth } from './mock-candor-auth'

test.beforeEach(async ({ page }) => {
  await mockCandorAuth(page, { asMember: true })
})

type Box = { x: number, y: number, width: number, height: number }

function overlaps(a: Box, b: Box) {
  return a.x < b.x + b.width
    && a.x + a.width > b.x
    && a.y < b.y + b.height
    && a.y + a.height > b.y
}

async function expectChartLabelsClean(page: import('@playwright/test').Page) {
  const chart = page.getByTestId('wearables-trend-chart')
  await expect(chart).toBeVisible()
  const { boxes, viewHeight } = await chart.evaluate((svg) => {
    const labels = Array.from(svg.querySelectorAll('.wearables-trend-value-label'))
    const boxes = labels.map((el) => {
      const box = (el as SVGGraphicsElement).getBBox()
      return { x: box.x, y: box.y, width: box.width, height: box.height }
    })
    return { boxes, viewHeight: svg.viewBox.baseVal.height }
  })
  expect(boxes.length).toBeGreaterThan(0)
  for (const box of boxes) {
    expect(box.y).toBeGreaterThanOrEqual(0)
    expect(box.y + box.height).toBeLessThanOrEqual(viewHeight)
  }
  for (let i = 0; i < boxes.length; i++) {
    for (let j = i + 1; j < boxes.length; j++) {
      expect(overlaps(boxes[i]!, boxes[j]!)).toBe(false)
    }
  }
}

const metrics = [
  { id: 'resting_hr', enTitle: 'Resting heart rate', zhPath: '/app/wearables/apple-watch?metric=resting_hr' },
  { id: 'steps', enTitle: 'Steps', zhPath: '/app/wearables/apple-watch?metric=steps' },
  { id: 'sleep_minutes', enTitle: 'Sleep', zhPath: '/app/wearables/apple-watch?metric=sleep_minutes' }
] as const

for (const metric of metrics) {
  test(`en 7-day ${metric.id} chart labels do not overlap or clip`, async ({ page, goto }) => {
    await goto(`/en/app/wearables/apple-watch?metric=${metric.id}`, { waitUntil: 'hydration' })
    await expect(page.getByTestId(`wearables-metric-${metric.id}`)).toHaveClass(/app-btn-primary/)
    await expectChartLabelsClean(page)
  })

  test(`zh 7-day ${metric.id} chart labels do not overlap or clip`, async ({ page, goto }) => {
    await goto(metric.zhPath, { waitUntil: 'hydration' })
    await expect(page.getByTestId(`wearables-metric-${metric.id}`)).toHaveClass(/app-btn-primary/)
    await expectChartLabelsClean(page)
  })
}

test('metric query selects matching active tab for sleep', async ({ page, goto }) => {
  await goto('/en/app/wearables/apple-watch?metric=sleep_minutes', { waitUntil: 'hydration' })
  await expect(page.getByTestId('wearables-metric-sleep_minutes')).toHaveClass(/app-btn-primary/)
  await expect(page.getByTestId('wearables-metric-resting_hr')).toHaveClass(/app-btn-segment/)
  await expect(page.getByRole('heading', { level: 2, name: 'Sleep' })).toBeVisible()
})
