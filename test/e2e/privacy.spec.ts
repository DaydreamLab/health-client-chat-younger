import { expect, test } from '@nuxt/test-utils/playwright'
import { mockCandorAuth } from './mock-candor-auth'

const CONSENT_KEY = 'candor.privacy.consent.version'

test('privacy page renders title and markdown from the public API', async ({ page, goto }) => {
  await mockCandorAuth(page)

  await goto('/privacy', { waitUntil: 'hydration' })

  await expect(page.getByTestId('privacy-title')).toHaveText('隱私權政策')
  await expect(page.getByTestId('privacy-meta')).toContainText('版本 2026-10-24')
  await expect(page.getByTestId('privacy-body')).toContainText('我們如何使用資料')
  await expect(page.getByTestId('privacy-body').locator('strong')).toHaveText('必要 Cookie')
  await expect(page.getByTestId('cookie-consent-banner')).toHaveCount(0)
})

test('cookie consent banner appears on first visit and persists by policy version', async ({ page, goto }) => {
  await mockCandorAuth(page, { privacyConsentVersion: false })

  await goto('/', { waitUntil: 'hydration' })

  const banner = page.getByTestId('cookie-consent-banner')
  await expect(banner).toBeVisible()
  await expect(page.getByTestId('cookie-consent-privacy-link')).toHaveAttribute('href', '/privacy')

  await page.getByTestId('cookie-consent-accept').click()
  await expect(banner).toHaveCount(0)

  const stored = await page.evaluate(key => localStorage.getItem(key), CONSENT_KEY)
  expect(stored).toBe('2026-10-24')

  await goto('/', { waitUntil: 'hydration' })
  await expect(page.getByTestId('cookie-consent-banner')).toHaveCount(0)
})

test('cookie consent re-prompts when policy version changes', async ({ page, goto }) => {
  await mockCandorAuth(page, { privacyConsentVersion: '2026-01-01' })

  await goto('/', { waitUntil: 'hydration' })

  await expect(page.getByTestId('cookie-consent-banner')).toBeVisible()
  await page.getByTestId('cookie-consent-accept').click()

  const stored = await page.evaluate(key => localStorage.getItem(key), CONSENT_KEY)
  expect(stored).toBe('2026-10-24')
})

test('footer privacy link opens the privacy page', async ({ page, goto }) => {
  await mockCandorAuth(page)

  await goto('/', { waitUntil: 'hydration' })
  await page.getByTestId('footer-privacy').click()
  await expect(page).toHaveURL(/\/privacy\/?$/)
  await expect(page.getByTestId('privacy-title')).toBeVisible()
})
