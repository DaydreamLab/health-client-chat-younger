import { expect, test } from '@nuxt/test-utils/playwright'

test('guest home page loads', async ({ page, goto }) => {
  await goto('/', { waitUntil: 'hydration' })
  await expect(page.getByTestId('brand')).toBeVisible()
  await expect(page.getByTestId('brand')).toHaveText('YOUNGER')
})

test('EN switch keeps selected style and translates plans', async ({ page, goto }) => {
  await goto('/', { waitUntil: 'hydration' })

  await page.getByRole('button', { name: 'EN' }).click()

  await expect(page).toHaveURL(/\/en\/?/)
  await expect(page.getByRole('button', { name: 'EN' })).toHaveAttribute('aria-pressed', 'true')
  await expect(page.getByRole('button', { name: '繁中' })).toHaveAttribute('aria-pressed', 'false')
  await expect(page.getByRole('link', { name: 'Plans', exact: true })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Three plans' })).toBeVisible()
  await expect(page.getByText('Basic: report reading')).toBeVisible()
})
