import { expect, test } from '@nuxt/test-utils/playwright'
import { mkdirSync } from 'node:fs'
import { e2eArtifactPath } from './helpers/artifacts-dir'
import { mockCandorAuth } from './mock-candor-auth'

test.describe('recommendations package items (方案內容)', () => {
  test('shows image, core／functional badges, daily dose; covers missing image', async ({ page, goto }) => {
    await mockCandorAuth(page, { asMember: true })
    await goto('/app/recommendations', { waitUntil: 'hydration' })
    await expect(page.getByTestId('recommendation-path-choice')).toBeVisible()
    await page.getByTestId('recommendation-path-ai').click()

    const items = page.getByTestId('package-items')
    await expect(items).toBeVisible({ timeout: 25_000 })
    await expect(items).toContainText('方案內容')

    const vitD = page.getByTestId('sellable-item-vitamin_d')
    await expect(vitD).toBeVisible()
    await expect(vitD.getByTestId('sellable-item-image')).toBeVisible()
    await expect(page.getByTestId('sellable-item-kind-vitamin_d')).toContainText('核心')
    await expect(page.getByTestId('sellable-item-dose-vitamin_d')).toContainText('每日 1 顆')

    const iron = page.getByTestId('sellable-item-iron')
    await expect(iron).toBeVisible()
    await expect(iron.getByTestId('sellable-item-image-fallback')).toBeVisible()
    await expect(page.getByTestId('sellable-item-kind-iron')).toContainText('功能型')
    await expect(page.getByTestId('sellable-item-dose-iron')).toContainText('每日 1 顆')

    await page.setViewportSize({ width: 390, height: 844 })
    await items.scrollIntoViewIfNeeded()
    const shotPath = e2eArtifactPath('recommendations-package-items-390.png')
    await page.screenshot({ path: shotPath, fullPage: false })
    try {
      mkdirSync('/opt/cursor/artifacts', { recursive: true })
      await page.screenshot({
        path: '/opt/cursor/artifacts/recommendations-package-items-390.png',
        fullPage: false
      })
    } catch {
      // Cloud agent artifacts dir is optional outside this environment.
    }
  })
})
