import type { Page } from '@playwright/test'
import { expect, test } from '@nuxt/test-utils/playwright'
import { mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { mockCandorAuth } from './mock-candor-auth'

/** Lazy: only called from the screenshot test, never at module load. */
function ensureIndex2ArtifactsDir(): string {
  const preferred = process.env.ARTIFACTS?.trim()
    || join('test-results', 'index2-screenshots')
  try {
    mkdirSync(preferred, { recursive: true })
    return preferred
  } catch {
    const fallback = join(tmpdir(), 'index2-screenshots')
    mkdirSync(fallback, { recursive: true })
    return fallback
  }
}

test.beforeEach(async ({ page }) => {
  await mockCandorAuth(page)
})

async function waitForCarouselSettle(page: Page) {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await expect(page.getByTestId('home-carousel')).toBeVisible()
  await expect(page.getByTestId('index2-pricing-plans')).toBeVisible()
  // Let autoplay finish one tick under reduced motion before shooting.
  await new Promise(resolve => setTimeout(resolve, 2500))
}

async function shotIndex2(page: Page, name: string) {
  const dir = ensureIndex2ArtifactsDir()
  await page.screenshot({
    path: join(dir, `${name}.png`),
    fullPage: true
  })
}

test('index2 mirrors original home copy without goals/labs/reviews; home unchanged', async ({ page, goto }) => {
  await goto('/index2', { waitUntil: 'hydration' })

  await expect(page.getByTestId('index2-page')).toBeVisible()
  await expect(page.getByTestId('home-goals')).toHaveCount(0)
  await expect(page.getByRole('heading', { name: '你想先改善哪裡' })).toHaveCount(0)
  await expect(page.getByRole('heading', { name: /想看清楚自己的健康/ })).toBeVisible()
  await expect(page.getByTestId('brand-hero')).toContainText('你的專屬智能健康助理')
  await expect(page.getByText('$4,500').first()).toBeVisible()
  await expect(page.getByText('顧問協作').first()).toBeVisible()
  await expect(page.getByRole('heading', { name: '3 步驟健康旅程，了解初步解析重點並精準改善' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'AI 對談與免費 OCR 解析', exact: true })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'AI 與 Younger 顧問協作解析說明', exact: true })).toBeVisible()
  await expect(page.getByRole('heading', { name: '選擇方案與解鎖', exact: true })).toBeVisible()
  await expect(page.getByTestId('home-carousel')).toBeVisible()
  await expect(page.getByTestId('home-report-preview')).toBeVisible()
  await expect(page.getByRole('heading', { name: '挑選您的健康訂製計畫' })).toBeVisible()
  await expect(page.getByText('【限時早鳥限定方案】')).toBeVisible()
  await expect(page.getByText('專案優惠價：$4,500（原價價值超過 $6,000+）')).toBeVisible()
  await expect(page.getByTestId('home-early-bird-cta')).toContainText('立即搶佔早鳥顧問協作名額')
  await expect(page.getByTestId('home-early-bird-cta')).toHaveAttribute('href', /\/index2\/?#plans/)
  await expect(page.getByTestId('hero-cta-plans')).toHaveAttribute('href', /\/index2\/?#plans/)
  await expect(page.getByTestId('hero-cta-labs')).toHaveCount(0)
  await expect(page.getByTestId('hero-cta-younger-labs')).toHaveCount(0)
  await expect(page.getByTestId('home-younger-labs')).toHaveCount(0)
  await expect(page.getByRole('heading', { name: '顧客好評' })).toHaveCount(0)
  await expect(page.getByTestId('package-advisor-booking')).toHaveCount(0)
  await expect(page.getByRole('link', { name: /預約 Younger 顧問|Book a Younger advisor/ })).toHaveCount(0)

  const robots = page.locator('meta[name="robots"]')
  await expect(robots).toHaveAttribute('content', /noindex/i)

  await expect(page.getByTestId('hero-cta-chat')).toHaveAttribute('href', /\/chat\/?$/)
  await expect(page.getByTestId('hero-cta-upload')).toHaveAttribute('href', /\/chat\/?$/)
  await expect(page.getByTestId('package-basic')).toBeVisible()
  await expect(page.getByTestId('package-advance')).toBeVisible()
  await expect(page.getByTestId('index2-pricing-plans')).toBeVisible()

  const footer = page.getByTestId('index2-footer')
  await expect(footer).toBeVisible()
  await expect(footer.getByTestId('footer-explore-plans')).toHaveAttribute('href', /\/index2\/?#plans/)
  await expect(footer.getByTestId('footer-explore-chat')).toHaveAttribute('href', /\/chat\/?$/)
  await expect(footer.getByTestId('footer-explore-health')).toHaveAttribute('href', /\/app\/?$/)
  await expect(footer.getByTestId('footer-support-orders')).toHaveAttribute('href', /\/app\/orders\/?$/)
  await expect(footer.getByText('常見問題')).toHaveCount(0)
  await expect(footer.getByText('聯絡我們')).toHaveCount(0)
  await expect(page.getByLabel('Instagram')).toHaveCount(0)
  await expect(page.getByLabel('Facebook')).toHaveCount(0)
  await expect(page.getByLabel('LINE')).toHaveCount(0)
  await expect(page.getByTestId('support-email')).toHaveCount(0)

  await goto('/', { waitUntil: 'hydration' })
  await expect(page.getByTestId('home-goals')).toBeVisible()
  await expect(page.getByRole('heading', { name: '你想先改善哪裡' })).toBeVisible()
  await expect(page.getByTestId('package-advisor-booking')).toHaveCount(0)
  await expect(page.locator('meta[name="robots"]')).toHaveCount(0)
  await expect(page.getByTestId('index2-footer')).toHaveCount(0)
  await expect(page.getByLabel('Instagram')).toBeVisible()
  await expect(page.getByTestId('home-early-bird-cta')).toHaveAttribute('href', /\/?#plans/)
})

test('EN index2 uses original English copy and locale-aware footer links', async ({ page, goto }) => {
  await goto('/en/index2', { waitUntil: 'hydration' })

  await expect(page.getByTestId('index2-page')).toBeVisible()
  await expect(page.getByTestId('home-goals')).toHaveCount(0)
  await expect(page.getByRole('heading', { name: 'Where do you want to start?' })).toHaveCount(0)
  await expect(page.getByRole('heading', { level: 1, name: /See your health clearly/ })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Start with a conversation and understand your body.' })).toBeVisible()
  await expect(page.getByText('$4,500').first()).toBeVisible()
  await expect(page.getByText('Limited early-bird plan')).toBeVisible()
  await expect(page.getByTestId('home-carousel')).toBeVisible()
  await expect(page.getByTestId('home-report-preview')).toBeVisible()
  await expect(page.getByTestId('home-early-bird-cta')).toContainText('Reserve an early-bird advisor slot')
  await expect(page.getByTestId('home-early-bird-cta')).toHaveAttribute('href', /\/en\/index2\/?#plans/)
  await expect(page.getByTestId('package-advisor-booking')).toHaveCount(0)
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/i)

  const footer = page.getByTestId('index2-footer')
  await expect(footer.getByTestId('footer-explore-plans')).toHaveAttribute('href', /\/en\/index2\/?#plans/)
  await expect(footer.getByTestId('footer-explore-chat')).toHaveAttribute('href', /\/en\/chat\/?$/)
  await expect(footer.getByTestId('footer-explore-health')).toHaveAttribute('href', /\/en\/app\/?$/)
  await expect(footer.getByTestId('footer-support-orders')).toHaveAttribute('href', /\/en\/app\/orders\/?$/)
  await expect(footer.getByText('FAQ')).toHaveCount(0)
  await expect(footer.getByText('Contact', { exact: true })).toHaveCount(0)
})

test('index2 screenshots zh/en desktop and 390', async ({ page, goto }) => {
  test.setTimeout(90_000)

  await page.setViewportSize({ width: 1280, height: 900 })
  await goto('/index2', { waitUntil: 'hydration' })
  await waitForCarouselSettle(page)
  await shotIndex2(page, 'index2-zh-desktop')

  await page.setViewportSize({ width: 390, height: 844 })
  await goto('/index2', { waitUntil: 'hydration' })
  await waitForCarouselSettle(page)
  await shotIndex2(page, 'index2-zh-mobile-390')

  await page.setViewportSize({ width: 1280, height: 900 })
  await goto('/en/index2', { waitUntil: 'hydration' })
  await waitForCarouselSettle(page)
  await shotIndex2(page, 'index2-en-desktop')

  await page.setViewportSize({ width: 390, height: 844 })
  await goto('/en/index2', { waitUntil: 'hydration' })
  await waitForCarouselSettle(page)
  await shotIndex2(page, 'index2-en-mobile-390')
})
