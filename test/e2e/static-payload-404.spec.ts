import { expect, test } from '@nuxt/test-utils/playwright'
import { mockCandorAuth } from './mock-candor-auth'

/**
 * In `nuxt dev` (Playwright default) payloads are not extracted the same way as
 * `pnpm generate`. Still assert that opening the English wearables detail does
 * not produce a failed `/_payload.json` network response — the static GH Pages
 * bug was HTML with data-src pointing at a skipped payload file.
 */
test('en wearables detail does not 404 on _payload.json', async ({ page, goto }) => {
  await mockCandorAuth(page, { asMember: true })

  const payloadFailures: string[] = []
  page.on('response', (response) => {
    const url = response.url()
    if (url.includes('_payload.json') && response.status() >= 400) {
      payloadFailures.push(`${response.status()} ${url}`)
    }
  })

  await goto('/en/app/wearables/apple-watch?metric=steps', { waitUntil: 'hydration' })
  await expect(page.getByTestId('wearables-detail')).toBeVisible()
  await page.getByTestId('wearables-metric-steps').click()
  await expect(page.getByTestId('wearables-metric-steps')).toHaveClass(/app-btn-primary/)

  expect(payloadFailures, payloadFailures.join('\n')).toEqual([])
})
