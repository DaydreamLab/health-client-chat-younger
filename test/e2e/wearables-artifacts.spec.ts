import { expect, test } from '@nuxt/test-utils/playwright'
import { mkdir } from 'node:fs/promises'
import path from 'node:path'
import { mockCandorAuth } from './mock-candor-auth'

const artifactsDir = process.env.WEARABLES_ARTIFACTS_DIR || '/opt/cursor/artifacts/wearables'
const prefix = process.env.WEARABLES_SCREENSHOT_PREFIX || 'after'

test.beforeAll(async () => {
  await mkdir(artifactsDir, { recursive: true })
})

test.beforeEach(async ({ page }) => {
  await mockCandorAuth(page, { asMember: true })
})

async function captureDetail(
  page: import('@playwright/test').Page,
  goto: (url: string, opts?: { waitUntil?: 'hydration' }) => Promise<void>,
  basePath: string,
  metric: 'resting_hr' | 'steps' | 'sleep_minutes',
  slug: string
) {
  await goto(`${basePath}?metric=${metric}`, { waitUntil: 'hydration' })
  await expect(page.getByTestId('wearables-detail')).toBeVisible()
  await expect(page.getByTestId(`wearables-metric-${metric}`)).toHaveClass(/app-btn-primary/)
  await page.screenshot({
    path: path.join(artifactsDir, `${prefix}-wearables-detail-${slug}.png`),
    fullPage: true
  })
}

test('capture wearables screenshots zh', async ({ page, goto }) => {
  await goto('/app/wearables', { waitUntil: 'hydration' })
  await expect(page.getByTestId('wearables-page')).toBeVisible()
  await page.screenshot({
    path: path.join(artifactsDir, `${prefix}-wearables-list-zh.png`),
    fullPage: true
  })
  const basePath = '/app/wearables/apple-watch'
  await captureDetail(page, goto, basePath, 'resting_hr', 'hr-zh')
  await captureDetail(page, goto, basePath, 'steps', 'steps-zh')
  await captureDetail(page, goto, basePath, 'sleep_minutes', 'sleep-zh')
})

test('capture wearables screenshots en', async ({ page, goto }) => {
  await goto('/en/app/wearables', { waitUntil: 'hydration' })
  await expect(page.getByTestId('wearables-page')).toBeVisible()
  await page.screenshot({
    path: path.join(artifactsDir, `${prefix}-wearables-list-en.png`),
    fullPage: true
  })
  const basePath = '/en/app/wearables/apple-watch'
  await captureDetail(page, goto, basePath, 'resting_hr', 'hr-en')
  await captureDetail(page, goto, basePath, 'steps', 'steps-en')
  await captureDetail(page, goto, basePath, 'sleep_minutes', 'sleep-en')
})
