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
  await page.route('**/api/v1/conversation/*/expert-review', async (route) => {
    if (route.request().method() === 'GET') {
      await route.fulfill({
        status: 404,
        contentType: 'application/json',
        body: JSON.stringify({
          status: 'failed',
          error_message: 'Expert review not found.',
          error_code: 'not_found'
        })
      })
      return
    }
    await route.fallback()
  })
}

/** 三要件之一：goals 必須先完成，完成 CTA 才依 RA 投影（非 legacy）。 */
async function finishGoalSelect(page: Page) {
  const entryB = page.getByTestId('chat-quiz-option-B')
  if (await entryB.isVisible().catch(() => false)) {
    await entryB.click()
  }
  await expect(page.getByTestId('chat-quiz-option-sleep')).toBeVisible({ timeout: 15_000 })
  await page.getByTestId('chat-quiz-option-sleep').click()
  await page.getByTestId('chat-quiz-confirm').click()
  await expect(page.getByTestId('chat-quiz-confirm')).toHaveCount(0, { timeout: 15_000 })
}

test.describe('standard /chat-ai vs expert /chat', () => {
  test.beforeEach(async ({ page }) => {
    await mockCandorAuth(page, { asMember: true })
    await seedNoExpertCase(page)
  })

  test('/chat completion CTA opens recommendations (v4 view_recommend)', async ({ page, goto }) => {
    test.setTimeout(90_000)
    await page.setViewportSize({ width: 1280, height: 800 })
    const completionPosts: string[] = []
    page.on('request', (request) => {
      if (request.method() === 'POST' && request.url().includes('/completion-choice')) {
        completionPosts.push(request.url())
      }
    })

    await goto('/chat', { waitUntil: 'hydration' })
    await page.evaluate(() => localStorage.removeItem('candor.unpaid.journey'))
    await finishGoalSelect(page)
    await page.getByTestId('chat-upload-input').setInputFiles(labsFile)
    await expect(page.getByTestId('chat-report-interpret')).toBeVisible({ timeout: 15_000 })
    await page.getByTestId('chat-report-interpret').click()

    const last = page.getByTestId('chat-last-reply')
    const viewRecommend = last.getByTestId('chat-view-recommend')
    await expect(viewRecommend).toBeVisible({ timeout: 15_000 })
    await expect(viewRecommend).toHaveText('查看推薦方案')
    await page.getByTestId('chat-report-dock-toggle').click()

    await viewRecommend.click()
    await expect(page).toHaveURL(/\/app\/recommendations\/?$/)
    await expect(page.getByTestId('recommendation-path-choice')).toBeVisible({ timeout: 15_000 })
    expect(completionPosts.length).toBeGreaterThan(0)
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

    await finishGoalSelect(page)
    await page.getByTestId('chat-upload-input').setInputFiles(labsFile)
    await expect(page.getByTestId('chat-report-interpret')).toBeVisible({ timeout: 15_000 })
    await page.getByTestId('chat-report-interpret').click()

    const view = page.getByTestId('chat-last-reply').getByTestId('chat-view-recommend')
    await expect(view).toBeVisible({ timeout: 15_000 })
    await expect(view).toHaveText('查看推薦方案')
    await expect(view).toHaveAttribute('data-flow', 'standard')
    await page.getByTestId('chat-report-dock-toggle').click()

    await view.click()
    await expect(page).toHaveURL(/\/app\/recommendations\?flow=standard/)
    await expect(page.getByTestId('recommendation-path-choice')).toBeVisible({ timeout: 15_000 })
    expect(expertPosts).toEqual([])
  })
})
