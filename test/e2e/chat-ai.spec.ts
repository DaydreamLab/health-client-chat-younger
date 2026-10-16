import type { Page } from '@playwright/test'
import { expect, test } from '@nuxt/test-utils/playwright'
import { mockCandorAuth } from './mock-candor-auth'

const labsFile = {
  name: 'labs.pdf',
  mimeType: 'application/pdf',
  buffer: Buffer.from('%PDF-1.4 demo')
}

async function seedNoExpertCase(page: Page) {
  await page.route('**/api/v1/expert-case-reviews**', async (route) => {
    if (route.request().method() !== 'GET') {
      await route.fallback()
      return
    }
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        status: 'success',
        data: { expert_case_reviews: [] }
      })
    })
  })
}

test.describe('standard /chat-ai vs expert /chat', () => {
  test.beforeEach(async ({ page }) => {
    await mockCandorAuth(page, { asMember: true })
    await seedNoExpertCase(page)
  })

  test('/chat still submits expert review', async ({ page, goto }) => {
    test.setTimeout(90_000)
    await page.setViewportSize({ width: 1280, height: 800 })
    const expertPosts: string[] = []
    page.on('request', (request) => {
      if (request.method() === 'POST' && request.url().includes('/expert-review')) {
        expertPosts.push(request.url())
      }
    })

    await goto('/chat', { waitUntil: 'hydration' })
    await page.evaluate(() => localStorage.removeItem('candor.unpaid.journey'))
    await page.getByTestId('chat-upload-input').setInputFiles(labsFile)
    await expect(page.getByTestId('chat-report-interpret')).toBeVisible({ timeout: 15_000 })
    await page.getByTestId('chat-report-interpret').click()

    const submit = page.getByTestId('chat-last-reply').getByTestId('chat-submit-expert-review')
    await expect(submit).toBeVisible({ timeout: 15_000 })
    await expect(submit).toHaveText('提交專家判讀')
    await expect(page.getByTestId('chat-view-recommend')).toHaveCount(0)
    await page.getByTestId('chat-report-dock-toggle').click()

    await submit.click()
    await expect(page).toHaveURL(/\/app\/?$/)
    expect(expertPosts.length).toBeGreaterThan(0)
  })

  test('/chat-ai opens direct recommendations without expert review', async ({ page, goto }) => {
    test.setTimeout(90_000)
    await page.setViewportSize({ width: 1280, height: 800 })
    const expertPosts: string[] = []
    page.on('request', (request) => {
      if (request.method() === 'POST' && request.url().includes('/expert-review')) {
        expertPosts.push(request.url())
      }
    })

    await goto('/chat-ai', { waitUntil: 'hydration' })
    await page.evaluate(() => localStorage.removeItem('candor.unpaid.journey'))
    await expect(page.getByTestId('nav-chat-ai')).toHaveCount(0)
    await expect(page.getByTestId('chat-flow-standard')).toHaveText('標準')

    await page.getByTestId('chat-upload-input').setInputFiles(labsFile)
    await expect(page.getByTestId('chat-report-interpret')).toBeVisible({ timeout: 15_000 })
    await page.getByTestId('chat-report-interpret').click()

    const view = page.getByTestId('chat-last-reply').getByTestId('chat-view-recommend')
    await expect(view).toBeVisible({ timeout: 15_000 })
    await expect(view).toHaveText('查看推薦方案')
    await expect(view).toHaveAttribute('data-flow', 'standard')
    await expect(page.getByTestId('chat-submit-expert-review')).toHaveCount(0)
    await page.getByTestId('chat-report-dock-toggle').click()

    await view.click()
    await expect(page).toHaveURL(/\/app\/recommendations\?flow=standard/)
    await expect(page.getByTestId('package-plan-basic')).toBeVisible({ timeout: 15_000 })
    await expect(page.getByTestId('checkout-card')).toBeVisible()
    await expect(page.getByTestId('expert-review-gate')).toHaveCount(0)
    expect(expertPosts).toEqual([])
  })
})
