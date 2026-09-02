import { expect, test } from '@nuxt/test-utils/playwright'

test('guest home page loads', async ({ page, goto }) => {
  await goto('/', { waitUntil: 'hydration' })
  await expect(page.getByTestId('brand')).toBeVisible()
  await expect(page.getByTestId('brand')).toHaveText('YOUNGER')
  await expect(page.getByRole('heading', { name: /想看清楚自己的健康/ })).toBeVisible()
  await expect(page.getByTestId('hero-cta-chat')).toBeVisible()
  await expect(page.getByTestId('plan-tab-basic')).toBeVisible()
  await expect(page.getByTestId('plan-tab-mid')).toBeVisible()
  await expect(page.getByTestId('plan-tab-premium')).toBeVisible()
  await expect(page.getByTestId('plan-cta-premium')).toBeVisible()
  await expect(page.getByRole('link', { name: '交給顧問' })).toHaveCount(0)
  await expect(page.getByTestId('color-mode-day')).toBeVisible()
  await expect(page.getByTestId('color-mode-dark')).toBeVisible()
})

test('EN switch keeps selected style and translates plans', async ({ page, goto }) => {
  await goto('/', { waitUntil: 'hydration' })

  await page.getByRole('button', { name: 'EN' }).click()

  await expect(page).toHaveURL(/\/en\/?/)
  await expect(page.getByRole('heading', { name: 'Three plans, matched to where you are' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'EN' })).toHaveAttribute('aria-pressed', 'true')
  await expect(page.getByRole('button', { name: '繁中' })).toHaveAttribute('aria-pressed', 'false')
  await expect(page.getByRole('link', { name: 'Plans', exact: true })).toBeVisible()
  await expect(page.getByText('Basic: report reading').first()).toBeVisible()
  await expect(page.getByText('Premium: personalized products').first()).toBeVisible()
  await expect(page.getByText('Mid: assisted testing').first()).toBeVisible()
})

test('plan CTA opens chat and AI can reply', async ({ page, goto }) => {
  await page.setViewportSize({ width: 1280, height: 560 })
  await goto('/', { waitUntil: 'hydration' })

  await page.getByTestId('plan-tab-basic').click()
  await page.getByTestId('plan-cta-basic').click()

  await expect(page).toHaveURL(/\/chat\?plan=basic/)
  await expect(page.getByRole('heading', { name: '諮詢' })).toBeVisible()
  await page.getByTestId('chat-chip-plans').click()
  await expect(page.getByTestId('chat-last-reply')).toContainText('一般適合手上已有紙本血檢')
  await page.getByTestId('chat-chip-next').click()
  await expect(page.getByTestId('chat-last-reply')).toContainText('付款才解鎖顧問')
  await expect(page.getByTestId('chat-last-reply')).toBeInViewport()
  const transcript = page.getByTestId('chat-transcript')
  await expect.poll(async () => transcript.evaluate((el) => {
    return el.scrollTop + el.clientHeight >= el.scrollHeight - 24
  })).toBe(true)

  await page.getByTestId('chat-input').fill('三個方案差在哪？')
  await page.getByTestId('chat-send').click()
  await expect(page.getByTestId('chat-last-reply')).toBeVisible()
  await expect(page.getByTestId('chat-last-reply')).toBeInViewport()
  await expect.poll(async () => transcript.evaluate((el) => {
    return el.scrollTop + el.clientHeight >= el.scrollHeight - 24
  })).toBe(true)
})

test('specialist handoff asks for login then shows health dashboard', async ({ page, goto }) => {
  await goto('/', { waitUntil: 'hydration' })
  await page.getByTestId('hero-cta-chat').click()
  await expect(page).toHaveURL(/\/chat\/?/)

  await page.getByTestId('chat-escalate').click()
  await expect(page).toHaveURL(/\/login/)

  await page.getByLabel('Email').fill('guest@example.com')
  await page.getByRole('button', { name: '繼續（示範登入）' }).click()

  await expect(page).toHaveURL(/\/chat/)
  await expect(page.getByTestId('chat-escalated')).toBeVisible()

  await page.getByRole('link', { name: '我的健康' }).first().click()
  await expect(page).toHaveURL(/\/app\/?$/)
  await expect(page.getByRole('heading', { name: '我的健康' })).toBeVisible()
  await expect(page.getByText('示範資料')).toBeVisible()
  await expect(page.getByTestId('health-score')).toBeVisible()
  await expect(page.getByRole('heading', { name: '分數趨勢' })).toBeVisible()
  await expect(page.getByRole('heading', { name: '營養' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'AI 教練' })).toHaveCount(0)
  await expect(page.getByRole('link', { name: '諮詢' }).first()).toBeVisible()
  await expect(page.getByRole('link', { name: '交給顧問' })).toHaveCount(0)
  await expect(page.getByTestId('account-user').filter({ hasText: 'Guest' }).first()).toBeVisible()
  await expect(page.getByText('guest@example.com')).toBeVisible()
})

test('day dark toggle sets html class', async ({ page, goto }) => {
  await goto('/', { waitUntil: 'hydration' })
  await page.getByTestId('color-mode-dark').click()
  await expect(page.locator('html')).toHaveClass(/dark/)
  await expect(page.getByTestId('color-mode-dark')).toHaveAttribute('aria-pressed', 'true')
  await expect(page.getByTestId('color-mode-day')).toHaveAttribute('aria-pressed', 'false')
  await page.getByTestId('color-mode-day').click()
  await expect(page.locator('html')).not.toHaveClass(/dark/)
  await expect(page.getByTestId('color-mode-day')).toHaveAttribute('aria-pressed', 'true')
  await expect(page.getByTestId('color-mode-dark')).toHaveAttribute('aria-pressed', 'false')
})
