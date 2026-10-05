import { expect, test } from '@nuxt/test-utils/playwright'
import { mockCandorAuth } from './mock-candor-auth'

test.beforeEach(async ({ page }) => {
  await mockCandorAuth(page)
})

test('home mobile nav stays inside the header toggle', async ({ page, goto }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await goto('/', { waitUntil: 'hydration' })

  const plans = page.locator('#home-mobile-nav').getByRole('link', { name: '方案', exact: true })
  await expect(page.getByTestId('home-nav-toggle').locator('svg')).toBeVisible()
  await expect(page.getByRole('button', { name: '語言：繁中' })).toBeVisible()
  await expect(page.locator('header').getByTestId('account-user')).toHaveCount(0)
  await expect(plans).toBeHidden()

  const headerBox = await page.locator('header').boundingBox()
  const brandBox = await page.getByTestId('brand').boundingBox()
  expect(headerBox).not.toBeNull()
  expect(brandBox).not.toBeNull()
  const headerMid = (headerBox?.x ?? 0) + (headerBox?.width ?? 0) / 2
  const brandMid = (brandBox?.x ?? 0) + (brandBox?.width ?? 0) / 2
  expect(Math.abs(brandMid - headerMid)).toBeLessThan(8)

  await page.getByTestId('home-nav-toggle').click()
  await expect(page.getByTestId('home-nav-toggle')).toHaveAttribute('aria-expanded', 'true')
  await expect(plans).toBeVisible()

  await plans.click()
  await expect(page).toHaveURL(/#plans/)
  await expect(plans).toBeHidden()
  await expect(page.getByTestId('home-nav-toggle')).toHaveAttribute('aria-expanded', 'false')
})

test('member home shows the avatar and shifts the wordmark left', async ({ page, goto }) => {
  await mockCandorAuth(page, { asMember: true })
  await page.setViewportSize({ width: 390, height: 844 })
  await goto('/', { waitUntil: 'hydration' })

  const account = page.locator('header').getByTestId('account-user')
  await expect(account).toBeVisible()
  await expect(account).toHaveText('GU')

  const headerBox = await page.locator('header').boundingBox()
  const brandBox = await page.getByTestId('brand').boundingBox()
  expect(headerBox).not.toBeNull()
  expect(brandBox).not.toBeNull()
  const headerMid = (headerBox?.x ?? 0) + (headerBox?.width ?? 0) / 2
  const brandMid = (brandBox?.x ?? 0) + (brandBox?.width ?? 0) / 2
  expect(brandMid).toBeLessThan(headerMid - 24)
})

test('guest home page loads', async ({ page, goto }) => {
  await goto('/', { waitUntil: 'hydration' })
  await expect(page.getByTestId('brand')).toBeVisible()
  await expect(page.getByTestId('brand')).toHaveAttribute('src', /brand-wordmark\.png$/)
  await expect(page.getByTestId('brand-dark')).toBeHidden()
  await expect(page.locator('header')).toHaveAttribute('data-header-state', 'overlay')
  await page.evaluate(() => window.scrollTo(0, 240))
  await expect(page.locator('header')).toHaveAttribute('data-header-state', 'solid')
  await page.evaluate(() => window.scrollTo(0, 0))
  await expect(page.locator('header')).toHaveAttribute('data-header-state', 'overlay')
  await expect(page.getByRole('heading', { name: /想看清楚自己的健康/ })).toBeVisible()
  await expect(page.getByRole('heading', { name: '從一次對談開始，看懂自己的身體' })).toBeVisible()
  await expect(page.getByTestId('home-carousel')).toBeVisible()
  await expect(page.getByRole('img', { name: '法國西印度櫻桃萃取維生素 C' })).toBeVisible()
  await expect(page.getByTestId('hero-cta-chat')).toBeVisible()
  await expect(page.getByTestId('package-basic')).toBeVisible()
  await expect(page.getByTestId('package-advance')).toBeVisible()
  await expect(page.getByText('基礎保養').first()).toBeVisible()
  await expect(page.getByText('完整調理').first()).toBeVisible()
  await expect(page.getByText('NT$5,000').first()).toBeVisible()
  await expect(page.getByText('NT$9,000').first()).toBeVisible()
  await expect(page.getByRole('link', { name: '交給顧問' })).toHaveCount(0)
  await expect(page.getByRole('button', { name: '語言：繁中' })).toBeVisible()
  await expect(page.getByTestId('color-mode-toggle')).toBeVisible()
  await expect(page.getByTestId('color-mode-toggle')).toHaveAttribute('aria-pressed', 'false')
  await expect(page.locator('html')).not.toHaveClass(/dark/)
})

test('EN switch keeps selected style and translates plans', async ({ page, goto }) => {
  await goto('/', { waitUntil: 'hydration' })

  await page.getByRole('button', { name: '語言：繁中' }).click()

  await expect(page).toHaveURL(/\/en\/?/)
  await expect(page.getByTestId('brand')).toHaveAttribute('src', /brand-wordmark\.png$/)
  await expect(page.getByRole('link', { name: 'Candor' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Start with a conversation and understand your body.' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Choose your monthly plan' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Language: EN' })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Plans', exact: true })).toBeVisible()
  await expect(page.getByText('Basic Care').first()).toBeVisible()
  await expect(page.getByText('Full Tune').first()).toBeVisible()
})

test('plan CTA opens chat and AI can reply', async ({ page, goto }) => {
  await page.setViewportSize({ width: 1280, height: 560 })
  await goto('/', { waitUntil: 'hydration' })

  await page.getByTestId('package-basic').click()

  await expect(page).toHaveURL(/\/chat\?package=basic/)
  await expect(page.getByRole('heading', { name: '諮詢' })).toBeVisible()
  await expect(page.getByTestId('chat-last-reply')).toContainText('改善方向')
  await expect(page.getByTestId('chat-selected-plan')).toContainText('基礎保養')
  await expect(page.getByTestId('chat-quiz-option-sleep_quality')).toBeVisible()
  await expect(page.getByTestId('chat-quiz-option-sleep_quality')).toHaveCSS('border-radius', '6px')
  await expect(page.getByTestId('chat-chip-plans')).toHaveCount(0)
  await page.getByTestId('chat-quiz-option-vitality').click()
  await page.getByTestId('chat-quiz-option-sleep_quality').click()
  await page.getByTestId('chat-quiz-confirm').click()
  await expect(page.getByTestId('chat-last-reply')).toBeVisible()
  const transcript = page.getByTestId('chat-transcript')
  await expect.poll(async () => transcript.evaluate((el) => {
    return el.scrollTop + el.clientHeight >= el.scrollHeight - 24
  })).toBe(true)

  page.once('dialog', dialog => dialog.accept())
  await page.getByTestId('chat-reset').click()
  await expect(page.getByTestId('chat-last-reply')).toContainText('改善方向')
  await expect(page.getByTestId('chat-quiz-option-vitality')).toBeVisible()
  expect(await page.evaluate(() => {
    const raw = localStorage.getItem('candor.unpaid.journey')
    if (!raw) {
      return null
    }
    return (JSON.parse(raw) as { messages?: unknown[] }).messages?.length ?? null
  })).toBe(1)
})

test('guest escalate and health dashboard without login wall', async ({ page, goto }) => {
  await goto('/', { waitUntil: 'hydration' })
  await page.getByTestId('hero-cta-chat').click()
  await expect(page).toHaveURL(/\/chat\/?/)

  await page.getByTestId('chat-escalate').click()
  await expect(page.getByTestId('chat-escalated')).toBeVisible()

  await page.getByRole('link', { name: '我的健康' }).first().click()
  await expect(page).toHaveURL(/\/app\/?$/)
  await expect(page.getByRole('heading', { name: '我的健康' })).toBeVisible()
  await expect(page.getByTestId('health-auth-gate')).toBeVisible()
  await expect(page.getByTestId('health-login')).toBeVisible()
  await expect(page.getByTestId('health-register')).toBeVisible()
  await expect(page.getByText('示範資料')).toHaveCount(0)
  await expect(page.getByTestId('nav-wearable')).toBeVisible()
  await page.getByTestId('nav-wearable').click()
  await expect(page).toHaveURL(/\/app\/wearables\/?/)
  await expect(page.getByTestId('wearables-soon')).toBeVisible()
  await expect(page.getByRole('heading', { name: '即將上線' })).toBeVisible()
  await page.getByTestId('wearables-back-health').click()
  await expect(page).toHaveURL(/\/app\/?$/)
  await expect(page.getByRole('heading', { name: '我的健康' })).toBeVisible()
  await expect(page.getByTestId('health-auth-gate')).toBeVisible()
  await page.getByTestId('nav-renewals').click()
  await expect(page).toHaveURL(/\/app\/renewals\/?/)
  await expect(page.getByTestId('renewals-soon')).toBeVisible()
  await expect(page.getByRole('heading', { name: '即將上線' })).toBeVisible()
  await page.getByTestId('renewals-back-health').click()
  await expect(page).toHaveURL(/\/app\/?$/)
  await expect(page.getByRole('heading', { name: '我的健康' })).toBeVisible()
  await expect(page.getByRole('link', { name: '諮詢' }).first()).toBeVisible()
  await expect(page.getByRole('link', { name: '我的訂單' }).first()).toBeVisible()
  await expect(page.getByRole('link', { name: '交給顧問' })).toHaveCount(0)
  await expect(page.getByTestId('user-sidebar')).toHaveAttribute('data-collapsed', 'true')
  await expect(page.getByTestId('user-sidebar').getByTestId('brand')).toHaveAttribute('src', /brand-mark\.png$/)
  await expect(page.getByTestId('user-header')).toBeHidden()
  await expect(page.getByTestId('user-sidebar').getByRole('button', { name: '語言：繁中' })).toBeVisible()
  await expect(page.getByTestId('user-sidebar').getByTestId('color-mode-toggle')).toBeVisible()
  await expect(page.getByTestId('account-user').first()).toHaveAttribute('title', 'Guest')
})

test('day dark toggle sets html class', async ({ page, goto }) => {
  await goto('/', { waitUntil: 'hydration' })
  await page.getByTestId('color-mode-toggle').click()
  await expect(page.locator('html')).toHaveClass(/dark/)
  await expect(page.getByTestId('color-mode-toggle')).toHaveAttribute('aria-pressed', 'true')
  await expect(page.getByTestId('brand')).toBeVisible()
  await expect(page.getByTestId('brand')).toHaveAttribute('src', /brand-wordmark\.png$/)
  await expect(page.getByTestId('brand-dark')).toHaveCount(0)
  await page.evaluate(() => window.scrollTo(0, 480))
  await expect(page.getByTestId('brand-dark')).toBeVisible()
  await expect(page.getByTestId('brand-dark')).toHaveAttribute('src', /brand-wordmark-dark\.png$/)
  await expect(page.getByTestId('brand')).toBeHidden()
  await page.getByTestId('color-mode-toggle').click()
  await expect(page.locator('html')).not.toHaveClass(/dark/)
  await expect(page.getByTestId('color-mode-toggle')).toHaveAttribute('aria-pressed', 'false')
  await expect(page.getByTestId('brand')).toBeVisible()
  await expect(page.getByTestId('brand-dark')).toBeHidden()
})

test('mobile nav stays inside the header toggle', async ({ page, goto }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await goto('/app', { waitUntil: 'hydration' })

  await expect(page.getByTestId('user-header')).toBeVisible()
  await expect(page.getByTestId('user-sidebar')).toBeHidden()
  const account = page.getByTestId('user-header').getByTestId('account-user')
  await expect(account).toHaveAttribute('title', 'Guest')
  await expect(account).toHaveText('GU')
  await expect(page.getByTestId('user-nav-toggle').locator('svg')).toBeVisible()
  await expect(page.getByTestId('nav-chat-mobile')).toBeHidden()

  await page.getByTestId('user-nav-toggle').click()
  await expect(page.getByTestId('user-nav-toggle')).toHaveAttribute('aria-expanded', 'true')
  await expect(page.getByTestId('nav-chat-mobile')).toBeVisible()

  await page.getByTestId('nav-chat-mobile').click()
  await expect(page).toHaveURL(/\/chat\/?/)
  await expect(page.getByTestId('nav-chat-mobile')).toBeHidden()
  await expect(page.getByTestId('user-nav-toggle')).toHaveAttribute('aria-expanded', 'false')
})
