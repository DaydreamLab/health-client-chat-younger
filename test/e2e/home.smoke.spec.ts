import { expect, test } from '@nuxt/test-utils/playwright'

test('guest home page loads', async ({ page, goto }) => {
  await goto('/', { waitUntil: 'hydration' })
  await expect(page.getByTestId('brand')).toBeVisible()
  await expect(page.getByTestId('brand')).toHaveText('YOUNGER')
})
