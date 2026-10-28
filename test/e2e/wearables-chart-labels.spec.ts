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
    return {
      labels,
      circles,
      linePath,
      dasharray,
      viewHeight: svg.viewBox.baseVal.height,
      viewWidth: svg.viewBox.baseVal.width
    }
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
    expect(label.left).toBeGreaterThanOrEqual(-0.5)
    expect(label.right).toBeLessThanOrEqual(payload.viewWidth + 0.5)
    expect(trendLabelCollidesWithGeometry(label, plotted)).toBe(false)
  }

  for (let i = 0; i < payload.labels.length; i++) {
    for (let j = i + 1; j < payload.labels.length; j++) {
      expect(boxesOverlap(payload.labels[i]!, payload.labels[j]!)).toBe(false)
    }
  }
}

async function expectChartLabelsInsideCard(page: import('@playwright/test').Page) {
  const chart = page.getByTestId('wearables-trend-chart')
  await expect(chart).toBeVisible()
  const result = await page.evaluate(() => {
    const svg = document.querySelector('[data-testid="wearables-trend-chart"]')
    const card = svg?.closest('section')
    if (!svg || !card) {
      return { ok: false as const, reason: 'missing chart or card' }
    }
    const cardBox = card.getBoundingClientRect()
    const overflows: string[] = []
    for (const el of svg.querySelectorAll('.wearables-trend-value-label')) {
      const box = el.getBoundingClientRect()
      const text = (el.textContent ?? '').trim()
      if (box.left < cardBox.left - 0.5 || box.right > cardBox.right + 0.5) {
        overflows.push(`${text} L=${box.left.toFixed(1)} R=${box.right.toFixed(1)} card=${cardBox.left.toFixed(1)}..${cardBox.right.toFixed(1)}`)
      }
    }
    return { ok: overflows.length === 0, overflows }
  })
  expect(result.ok, JSON.stringify(result)).toBe(true)
}

// Bilingual smoke (one metric each); full metric matrix deleted as redundant.
test('en 7-day steps chart labels avoid clip, overlap, line and points', async ({ page, goto }) => {
  await goto('/en/app/wearables/apple-watch?metric=steps', { waitUntil: 'hydration' })
  await expect(page.getByTestId('wearables-metric-steps')).toHaveClass(/app-btn-primary/)
  await expectChartLabelsClear(page)
})

test('zh 7-day steps chart labels avoid clip, overlap, line and points', async ({ page, goto }) => {
  await goto('/app/wearables/apple-watch?metric=steps', { waitUntil: 'hydration' })
  await expect(page.getByTestId('wearables-metric-steps')).toHaveClass(/app-btn-primary/)
  await expectChartLabelsClear(page)
})

test('metric query selects matching active tab for sleep', async ({ page, goto }) => {
  await goto('/en/app/wearables/apple-watch?metric=sleep_minutes', { waitUntil: 'hydration' })
  await expect(page.getByTestId('wearables-metric-sleep_minutes')).toHaveClass(/app-btn-primary/)
  await expect(page.getByTestId('wearables-metric-resting_hr')).toHaveClass(/app-btn-segment/)
  await expect(page.getByRole('heading', { level: 2, name: 'Sleep' })).toBeVisible()
})

// Named repro: Oura EN steps overflow at 390/430.
test('mobile 430px en oura-ring steps labels stay inside card', async ({ page, goto }) => {
  await page.setViewportSize({ width: 430, height: 844 })
  await goto('/en/app/wearables/oura-ring?metric=steps', { waitUntil: 'hydration' })
  await expect(page.getByTestId('wearables-metric-steps')).toHaveClass(/app-btn-primary/)
  await expectChartLabelsClear(page)
  await expectChartLabelsInsideCard(page)
})

// Keep one 390 en (same device/metric as 430 repro) + one zh smoke; drop 10/12 matrix.
test('mobile 390px en oura-ring steps labels stay inside card', async ({ page, goto }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await goto('/en/app/wearables/oura-ring?metric=steps', { waitUntil: 'hydration' })
  await expect(page.getByTestId('wearables-metric-steps')).toHaveClass(/app-btn-primary/)
  await expectChartLabelsClear(page)
  await expectChartLabelsInsideCard(page)
})

test('mobile 390px zh oura-ring steps labels stay inside card', async ({ page, goto }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await goto('/app/wearables/oura-ring?metric=steps', { waitUntil: 'hydration' })
  await expect(page.getByTestId('wearables-metric-steps')).toHaveClass(/app-btn-primary/)
  await expectChartLabelsClear(page)
  await expectChartLabelsInsideCard(page)
})
