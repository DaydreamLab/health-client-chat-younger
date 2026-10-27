import { expect, test } from '@nuxt/test-utils/playwright'
import { mockCandorAuth } from './mock-candor-auth'

test('about page renders title, lead, and body without version meta', async ({ page, goto }) => {
  await mockCandorAuth(page)

  await goto('/about', { waitUntil: 'hydration' })

  await expect(page.getByTestId('about-page')).toBeVisible()
  await expect(page.getByTestId('about-title')).toHaveText('關於坦見')
  await expect(page.getByTestId('about-lead')).toContainText('你的生理數據顧問')
  await expect(page.getByTestId('about-body')).toContainText('我們是誰')
  await expect(page.getByTestId('about-body')).toContainText('Daydream Lab')
  await expect(page.locator('[data-testid="about-page"]')).not.toContainText('版本')
  await expect(page.locator('[data-testid="about-page"]')).not.toContainText('更新日期')
})

test('terms page renders title, version meta, and body', async ({ page, goto }) => {
  await mockCandorAuth(page)

  await goto('/terms', { waitUntil: 'hydration' })

  await expect(page.getByTestId('terms-page')).toBeVisible()
  await expect(page.getByTestId('terms-title')).toHaveText('服務條款')
  await expect(page.getByTestId('terms-meta')).toContainText('版本 1')
  await expect(page.getByTestId('terms-meta')).toContainText('更新日期')
  await expect(page.getByTestId('terms-body')).toContainText('適用範圍')
  await expect(page.getByTestId('terms-body')).toContainText('準據法')
})

test('footer about and terms links open the matching pages', async ({ page, goto }) => {
  await mockCandorAuth(page)

  await goto('/', { waitUntil: 'hydration' })

  await page.getByTestId('footer-about').click()
  await expect(page).toHaveURL(/\/about\/?$/)
  await expect(page.getByTestId('about-title')).toBeVisible()

  await page.getByTestId('footer-terms').click()
  await expect(page).toHaveURL(/\/terms\/?$/)
  await expect(page.getByTestId('terms-title')).toBeVisible()

  await page.getByTestId('footer-privacy').click()
  await expect(page).toHaveURL(/\/privacy\/?$/)
  await expect(page.getByTestId('privacy-title')).toBeVisible()
})
