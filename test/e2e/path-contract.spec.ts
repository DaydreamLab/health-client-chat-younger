import type { Page } from '@playwright/test'
import { expect, test } from '@nuxt/test-utils/playwright'
import { mockCandorAuth } from './mock-candor-auth'

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

async function openFreshChat(page: Page, goto: (path: string, opts?: { waitUntil?: 'hydration' }) => Promise<unknown>) {
  await page.setViewportSize({ width: 1280, height: 800 })
  await goto('/chat', { waitUntil: 'hydration' })
  await page.evaluate(() => localStorage.removeItem('candor.unpaid.journey'))
  await page.reload({ waitUntil: 'domcontentloaded' })
  await expect(page.getByTestId('chat-transcript')).toBeVisible({ timeout: 20_000 })
}

test.describe('path contract (A／B／C)', () => {
  test('進站三選：A／B／C chips 可見', async ({ page, goto }) => {
    test.setTimeout(90_000)
    await mockCandorAuth(page, {
      asMember: true,
      conversationPath: null,
      basicProfileComplete: false
    })
    await seedNoExpertCase(page)
    await openFreshChat(page, goto)

    await expect(page.getByTestId('chat-quiz-option-A')).toBeVisible({ timeout: 15_000 })
    await expect(page.getByTestId('chat-quiz-option-B')).toBeVisible()
    await expect(page.getByTestId('chat-quiz-option-C')).toBeVisible()
    await expect(page.getByTestId('chat-quiz-option-A')).toHaveText('我想聊聊')
    await expect(page.getByTestId('chat-quiz-option-B')).toHaveText('我想諮詢健康方案')
    await expect(page.getByTestId('chat-quiz-option-C')).toHaveText('幫我看報告')
    await expect(page.getByTestId('chat-submit-expert-review')).toHaveCount(0)
  })

  test('path A：usable offer_recommend 仍不顯示完成 CTA', async ({ page, goto }) => {
    test.setTimeout(90_000)
    await mockCandorAuth(page, {
      asMember: true,
      conversationPath: 'A',
      basicProfileComplete: true,
      replyActions: 'offer_recommend'
    })
    await seedNoExpertCase(page)
    await openFreshChat(page, goto)

    // Path A skips entry; may show goals — finish or just send.
    const sleep = page.getByTestId('chat-quiz-option-sleep')
    if (await sleep.isVisible().catch(() => false)) {
      await sleep.click()
      await page.getByTestId('chat-quiz-confirm').click()
    }
    const input = page.getByTestId('chat-input')
    await input.fill('聊聊睡眠')
    await page.getByTestId('chat-send').click()

    const last = page.getByTestId('chat-last-reply')
    await expect(last).toBeVisible({ timeout: 15_000 })
    await expect(last.getByTestId('chat-submit-expert-review')).toHaveCount(0)
  })

  test('path B：基本未齊時必填 sex 被問出；完成 CTA 不出現', async ({ page, goto }) => {
    test.setTimeout(90_000)
    await mockCandorAuth(page, {
      asMember: true,
      conversationPath: 'B',
      basicProfileComplete: false,
      replyActions: 'offer_recommend'
    })
    await seedNoExpertCase(page)
    await openFreshChat(page, goto)

    // Client／next_question placeholder asks sex first.
    await expect(page.getByTestId('chat-quiz-option-F')).toBeVisible({ timeout: 15_000 })
    await expect(page.getByTestId('chat-submit-expert-review')).toHaveCount(0)
  })

  test('path B：基本齊 + usable offer_recommend → 完成 CTA；文案不改壞', async ({ page, goto }) => {
    test.setTimeout(90_000)
    await mockCandorAuth(page, {
      asMember: true,
      conversationPath: 'B',
      basicProfileComplete: true,
      replyActions: 'offer_recommend'
    })
    await seedNoExpertCase(page)
    await openFreshChat(page, goto)

    const sleep = page.getByTestId('chat-quiz-option-sleep')
    await expect(sleep).toBeVisible({ timeout: 15_000 })
    await sleep.click()
    await page.getByTestId('chat-quiz-confirm').click()
    await page.getByTestId('chat-input').fill('請給方案')
    await page.getByTestId('chat-send').click()

    const last = page.getByTestId('chat-last-reply')
    await expect(last.getByTestId('chat-submit-expert-review')).toBeVisible({ timeout: 15_000 })
    await expect(last.getByTestId('chat-submit-expert-review')).toHaveText('取得專屬保健品方案')
    await expect(last.getByTestId('chat-submit-expert-review-hint')).toHaveText(
      '以上為 AI 對話資訊，專人將於 24 小時內為您處理'
    )
  })

  test('path B：基本齊 + RA none → 不硬掛完成 CTA', async ({ page, goto }) => {
    test.setTimeout(90_000)
    await mockCandorAuth(page, {
      asMember: true,
      conversationPath: 'B',
      basicProfileComplete: true,
      replyActions: 'none'
    })
    await seedNoExpertCase(page)
    await openFreshChat(page, goto)

    const sleep = page.getByTestId('chat-quiz-option-sleep')
    if (await sleep.isVisible().catch(() => false)) {
      await sleep.click()
      await page.getByTestId('chat-quiz-confirm').click()
    }
    await page.getByTestId('chat-input').fill('還有嗎')
    await page.getByTestId('chat-send').click()

    const last = page.getByTestId('chat-last-reply')
    await expect(last).toBeVisible({ timeout: 15_000 })
    await expect(last.getByTestId('chat-submit-expert-review')).toHaveCount(0)
  })

  test('path C skip → 退回 B，並開始必填', async ({ page, goto }) => {
    test.setTimeout(90_000)
    await mockCandorAuth(page, {
      asMember: true,
      conversationPath: 'C',
      basicProfileComplete: false
    })
    await seedNoExpertCase(page)
    await openFreshChat(page, goto)

    await expect(page.getByTestId('chat-quiz-option-path_c_skip')).toBeVisible({ timeout: 15_000 })
    await page.getByTestId('chat-quiz-option-path_c_skip').click()
    // Demote to B → ensure required sex ask.
    await expect(page.getByTestId('chat-quiz-option-F')).toBeVisible({ timeout: 15_000 })
  })
})
