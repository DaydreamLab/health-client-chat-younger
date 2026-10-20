import { expect, test } from '@nuxt/test-utils/playwright'
import {
  assertTrendLineMatchesPoints,
  boxesOverlap,
  parseTrendLinePath,
  trendLabelCollidesWithGeometry
} from '../../app/utils/health-trend-chart'
import { mockCandorAuth } from './mock-candor-auth'

test.beforeEach(async ({ page }) => {
  await mockCandorAuth(page, { asMember: true })
})

async function expectChartLabelsClear(page: import('@playwright/test').Page) {
  const chart = page.getByTestId('wearables-trend-chart')
  await expect(chart).toBeVisible()
  const payload = await chart.evaluate((svg) => {
    const labels = Array.from(svg.querySelectorAll('.wearables-trend-value-label')).map((el) => {
      const box = (el as SVGGraphicsElement).getBBox()
      return { left: box.x, right: box.x + box.width, top: box.y, bottom: box.y + box.height }
    })
    const circles = Array.from(svg.querySelectorAll('circle')).map(el => ({
      x: Number(el.getAttribute('cx')),
      y: Number(el.getAttribute('cy'))
    }))
    const line = svg.querySelector('[data-testid="wearables-trend-line"]')
    const linePath = line?.getAttribute('d') ?? ''
    const dasharray = line ? getComputedStyle(line).strokeDasharray : ''
    return { labels, circles, linePath, dasharray, viewHeight: svg.viewBox.baseVal.height }
  })

  expect(payload.labels.length).toBeGreaterThan(0)
  expect(payload.circles.length).toBe(payload.labels.length)

  expect(payload.dasharray).toBe('none')
  const lineVertices = parseTrendLinePath(payload.linePath)
  const plotted = payload.circles.map((point, index) => ({
    key: `p${index}`,
    value: 0,
    x: point.x,
    y: point.y
  }))
  assertTrendLineMatchesPoints(lineVertices, plotted)

  for (const label of payload.labels) {
    expect(label.top).toBeGreaterThanOrEqual(0)
    expect(label.bottom).toBeLessThanOrEqual(payload.viewHeight)
    expect(trendLabelCollidesWithGeometry(label, plotted)).toBe(false)
  }

  for (let i = 0; i < payload.labels.length; i++) {
    for (let j = i + 1; j < payload.labels.length; j++) {
      expect(boxesOverlap(payload.labels[i]!, payload.labels[j]!)).toBe(false)
    }
  }
}

const metrics = ['resting_hr', 'steps', 'sleep_minutes'] as const

for (const metric of metrics) {
  test(`en 7-day ${metric} chart labels avoid clip, overlap, line and points`, async ({ page, goto }) => {
    await goto(`/en/app/wearables/apple-watch?metric=${metric}`, { waitUntil: 'hydration' })
    await expect(page.getByTestId(`wearables-metric-${metric}`)).toHaveClass(/app-btn-primary/)
    await expectChartLabelsClear(page)
  })

  test(`zh 7-day ${metric} chart labels avoid clip, overlap, line and points`, async ({ page, goto }) => {
    await goto(`/app/wearables/apple-watch?metric=${metric}`, { waitUntil: 'hydration' })
    await expect(page.getByTestId(`wearables-metric-${metric}`)).toHaveClass(/app-btn-primary/)
    await expectChartLabelsClear(page)
  })
}

test('metric query selects matching active tab for sleep', async ({ page, goto }) => {
  await goto('/en/app/wearables/apple-watch?metric=sleep_minutes', { waitUntil: 'hydration' })
  await expect(page.getByTestId('wearables-metric-sleep_minutes')).toHaveClass(/app-btn-primary/)
  await expect(page.getByTestId('wearables-metric-resting_hr')).toHaveClass(/app-btn-segment/)
  await expect(page.getByRole('heading', { level: 2, name: 'Sleep' })).toBeVisible()
})
