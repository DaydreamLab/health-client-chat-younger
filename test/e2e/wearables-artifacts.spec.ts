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

test('capture wearables screenshots zh', async ({ page, goto }) => {
  await goto('/app/wearables', { waitUntil: 'hydration' })
  await expect(page.getByTestId('wearables-page')).toBeVisible()
  await page.screenshot({
    path: path.join(artifactsDir, `${prefix}-wearables-list-zh.png`),
    fullPage: true
  })
  await goto('/app/wearables/apple-watch', { waitUntil: 'hydration' })
  await expect(page.getByTestId('wearables-detail')).toBeVisible()
  await page.getByTestId('wearables-metric-resting_hr').click()
  await page.screenshot({
    path: path.join(artifactsDir, `${prefix}-wearables-detail-hr-zh.png`),
    fullPage: true
  })
  await page.getByTestId('wearables-metric-sleep_minutes').click()
  await page.screenshot({
    path: path.join(artifactsDir, `${prefix}-wearables-detail-sleep-zh.png`),
    fullPage: true
  })
})

test('capture wearables screenshots en', async ({ page, goto }) => {
  await goto('/en/app/wearables', { waitUntil: 'hydration' })
  await expect(page.getByTestId('wearables-page')).toBeVisible()
  await page.screenshot({
    path: path.join(artifactsDir, `${prefix}-wearables-list-en.png`),
    fullPage: true
  })
  await goto('/en/app/wearables/apple-watch', { waitUntil: 'hydration' })
  await expect(page.getByTestId('wearables-detail')).toBeVisible()
  await page.getByTestId('wearables-metric-resting_hr').click()
  await page.screenshot({
    path: path.join(artifactsDir, `${prefix}-wearables-detail-hr-en.png`),
    fullPage: true
  })
  await page.getByTestId('wearables-metric-sleep_minutes').click()
  await page.screenshot({
    path: path.join(artifactsDir, `${prefix}-wearables-detail-sleep-en.png`),
    fullPage: true
  })
})
