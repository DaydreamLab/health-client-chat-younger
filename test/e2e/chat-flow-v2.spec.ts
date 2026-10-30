import type { Page } from '@playwright/test'
import { expect, test } from '@nuxt/test-utils/playwright'
import { mockCandorAuth, FLOW_V2_PATH_C_BASICS } from './mock-candor-auth'

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
  await goto('/chat', { waitUntil: 'hydration' })
  await expect(page.getByTestId('chat-transcript')).toBeVisible({ timeout: 20_000 })
}

async function selectEntryPath(page: Page, path: 'A' | 'B' | 'C') {
  await expect(page.getByTestId(`chat-quiz-option-${path}`)).toBeVisible({ timeout: 15_000 })
  await page.getByTestId(`chat-quiz-option-${path}`).click()
}

async function finishGoalSelect(page: Page) {
  await expect(page.getByTestId('chat-quiz-option-sleep')).toBeVisible({ timeout: 15_000 })
  await page.getByTestId('chat-quiz-option-sleep').click()
  await page.getByTestId('chat-quiz-confirm').click()
  await expect(page.getByTestId('chat-quiz-confirm')).toHaveCount(0, { timeout: 15_000 })
}

async function sendChatLine(page: Page, text: string) {
  const input = page.getByTestId('chat-input')
  await input.fill(text)
  await page.getByTestId('chat-send').click()
}

test.describe('chat flow v2 — 四條主流程', () => {
  test('A：滿 15 題出引導（path_switch + checkup）', async ({ page, goto }) => {
    test.setTimeout(120_000)
    await mockCandorAuth(page, {
      asMember: true,
      conversationPath: null,
      individualTestsUrl: 'https://example.test/checkup',
      chatFlowV2: 'a-guide-15'
    })
    await seedNoExpertCase(page)
    await openFreshChat(page, goto)
    await selectEntryPath(page, 'A')

    for (let i = 0; i < 15; i++) {
      await sendChatLine(page, `聊聊 ${i + 1}`)
      await expect(page.getByTestId('chat-send')).toBeEnabled({ timeout: 15_000 })
    }

    const last = page.getByTestId('chat-last-reply')
    await expect(last).toContainText('專屬保健品方案', { timeout: 15_000 })
    await expect(last.getByTestId('chat-quiz-option-b')).toBeVisible()
    await expect(last.getByTestId('chat-message-checkup')).toBeVisible()
    await expect(last.getByTestId('chat-submit-expert-review')).toHaveCount(0)
  })

  test('B：問完必填 → 完成按鈕組', async ({ page, goto }) => {
    test.setTimeout(90_000)
    await mockCandorAuth(page, {
      asMember: true,
      conversationPath: null,
      basicProfileComplete: true,
      chatFlowV2: 'b-completion'
    })
    await seedNoExpertCase(page)
    await openFreshChat(page, goto)
    await selectEntryPath(page, 'B')
    await finishGoalSelect(page)
    await sendChatLine(page, '請給方案')

    const last = page.getByTestId('chat-last-reply')
    await expect(last.getByTestId('chat-submit-expert-review')).toBeVisible({ timeout: 15_000 })
    await expect(last.getByTestId('chat-quiz-option-continue')).toHaveText('繼續健康諮詢')
    await expect(last.getByTestId('chat-message-checkup')).toBeVisible()
  })

  test('C：上傳後問完 goals → 完成按鈕組（無 checkup）', async ({ page, goto }) => {
    test.setTimeout(120_000)
    await mockCandorAuth(page, {
      asMember: true,
      conversationPath: null,
      basicProfileComplete: true,
      chatFlowV2: 'c-completion'
    })
    await seedNoExpertCase(page)
    await openFreshChat(page, goto)
    await selectEntryPath(page, 'C')

    await page.getByTestId('chat-message-upload').click()
    await page.setInputFiles('[data-testid="chat-upload-input"]', {
      name: 'report.pdf',
      mimeType: 'application/pdf',
      buffer: Buffer.from('%PDF-1.4 mock')
    })

    await expect(page.getByTestId('chat-transcript')).toContainText(FLOW_V2_PATH_C_BASICS, { timeout: 30_000 })
    await page.getByTestId('chat-report-dock-toggle').click()
    await finishGoalSelect(page)
    await sendChatLine(page, '請依報告建議')

    const last = page.getByTestId('chat-last-reply')
    await expect(last.getByTestId('chat-submit-expert-review')).toBeVisible({ timeout: 20_000 })
    await expect(last.getByTestId('chat-quiz-option-continue')).toBeVisible()
    await expect(last.getByTestId('chat-message-checkup')).toHaveCount(0)
  })

  for (const terminal of ['ready', 'needs_review'] as const) {
    test(`C：${terminal} 綁定後 stream「我的報告已上傳」`, async ({ page, goto }) => {
      test.setTimeout(90_000)
      await mockCandorAuth(page, {
        asMember: true,
        conversationPath: null,
        basicProfileComplete: true,
        reportTerminalStatus: terminal
      })
      await seedNoExpertCase(page)
      await openFreshChat(page, goto)
      await selectEntryPath(page, 'C')

      const streamAck = page.waitForRequest((req) => {
        if (req.method() !== 'POST' || !req.url().includes('/messages/stream')) {
          return false
        }
        return (req.postData() || '').includes('我的報告已上傳')
      }, { timeout: 30_000 })

      await page.getByTestId('chat-message-upload').click()
      await page.setInputFiles('[data-testid="chat-upload-input"]', {
        name: 'report.pdf',
        mimeType: 'application/pdf',
        buffer: Buffer.from('%PDF-1.4 mock')
      })

      const transcript = page.getByTestId('chat-transcript')
      await expect(transcript).toContainText(FLOW_V2_PATH_C_BASICS, { timeout: 30_000 })
      await streamAck
      await expect(transcript).toContainText('我的報告已上傳')
    })
  }

  test('20 題上限：後端文案 + 按鈕', async ({ page, goto }) => {
    test.setTimeout(120_000)
    await mockCandorAuth(page, {
      asMember: true,
      conversationPath: null,
      chatFlowV2: 'turn-limit-20'
    })
    await seedNoExpertCase(page)
    await openFreshChat(page, goto)
    await selectEntryPath(page, 'B')
    await finishGoalSelect(page)

    for (let i = 0; i < 20; i++) {
      await sendChatLine(page, `第 ${i + 1} 題`)
      await expect(page.getByTestId('chat-send')).toBeEnabled({ timeout: 15_000 })
    }

    const last = page.getByTestId('chat-last-reply')
    await expect(last).toContainText('這個對話已到上限', { timeout: 15_000 })
    await expect(last.getByTestId('chat-submit-expert-review')).toBeVisible()
    await expect(last.getByTestId('chat-quiz-option-continue')).toBeVisible()
  })
})
