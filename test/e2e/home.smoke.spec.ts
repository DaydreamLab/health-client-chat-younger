import { expect, test } from '@nuxt/test-utils/playwright'
import { mockCandorAuth } from './mock-candor-auth'

test.beforeEach(async ({ page }) => {
  await mockCandorAuth(page)
})

test('guest home page loads', async ({ page, goto }) => {
  await goto('/', { waitUntil: 'hydration' })
  await expect(page.getByTestId('brand')).toBeVisible()
  await expect(page.getByTestId('brand')).toHaveText('坦見')
  await expect(page.getByRole('heading', { name: /想看清楚自己的健康/ })).toBeVisible()
  await expect(page.getByTestId('hero-cta-chat')).toBeVisible()
  await expect(page.getByTestId('package-basic')).toBeVisible()
  await expect(page.getByTestId('package-advance')).toBeVisible()
  await expect(page.getByText('基礎保養').first()).toBeVisible()
  await expect(page.getByText('完整調理').first()).toBeVisible()
  await expect(page.getByText('NT$5,000').first()).toBeVisible()
  await expect(page.getByText('NT$9,000').first()).toBeVisible()
  await expect(page.getByRole('link', { name: '交給顧問' })).toHaveCount(0)
  await expect(page.getByTestId('color-mode-day')).toBeVisible()
  await expect(page.getByTestId('color-mode-dark')).toBeVisible()
  await expect(page.getByTestId('color-mode-day')).toHaveAttribute('aria-pressed', 'true')
  await expect(page.getByTestId('color-mode-dark')).toHaveAttribute('aria-pressed', 'false')
  await expect(page.locator('html')).not.toHaveClass(/dark/)
})

test('EN switch keeps selected style and translates plans', async ({ page, goto }) => {
  await goto('/', { waitUntil: 'hydration' })

  await page.getByRole('button', { name: 'EN' }).click()

  await expect(page).toHaveURL(/\/en\/?/)
  await expect(page.getByTestId('brand')).toHaveText('Candor')
  await expect(page.getByRole('heading', { name: 'Two one-month plans' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'EN' })).toHaveAttribute('aria-pressed', 'true')
  await expect(page.getByRole('button', { name: '繁中' })).toHaveAttribute('aria-pressed', 'false')
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
  await expect(page.getByTestId('chat-chip-plans')).toHaveCount(0)
  await page.getByTestId('chat-quiz-option-vitality').click()
  await page.getByTestId('chat-quiz-confirm').click()
  await expect(page.getByTestId('chat-last-reply')).toBeVisible()
  const transcript = page.getByTestId('chat-transcript')
  await expect.poll(async () => transcript.evaluate((el) => {
    return el.scrollTop + el.clientHeight >= el.scrollHeight - 24
  })).toBe(true)
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
  await expect(page.getByText('示範資料')).toBeVisible()
  await expect(page.getByTestId('health-score')).toBeVisible()
  await expect(page.getByTestId('health-system-pie')).toBeVisible()
  await expect(page.getByRole('heading', { name: '系統分布' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'AI 總結' })).toBeVisible()
  await expect(page.getByTestId('health-ai-summary')).toContainText('維他命 D')
  await expect(page.getByRole('heading', { name: '血檢數值' })).toBeVisible()
  await expect(page.getByRole('heading', { name: '數值異常項目' })).toBeVisible()
  await expect(page.getByRole('heading', { name: '全部化驗值' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'AI 教練' })).toHaveCount(0)
  await expect(page.getByRole('link', { name: '諮詢' }).first()).toBeVisible()
  await expect(page.getByRole('link', { name: '我的訂單' }).first()).toBeVisible()
  await expect(page.getByRole('link', { name: '交給顧問' })).toHaveCount(0)
  await expect(page.getByTestId('user-sidebar')).toHaveAttribute('data-collapsed', 'true')
  await expect(page.getByTestId('user-sidebar').getByTestId('brand')).toHaveText('C')
  await expect(page.getByTestId('user-header')).toBeHidden()
  await expect(page.getByTestId('user-sidebar').getByRole('button', { name: '繁中' })).toBeVisible()
  await expect(page.getByTestId('user-sidebar').getByTestId('color-mode-day')).toBeVisible()
  await expect(page.getByTestId('account-user').first()).toHaveAttribute('title', 'Guest')
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
