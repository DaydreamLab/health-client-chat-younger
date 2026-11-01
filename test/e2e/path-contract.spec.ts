import type { Page } from '@playwright/test'
import { expect, test } from '@nuxt/test-utils/playwright'
import {
  FLOW_V2_GREETING_CONSULT,
  FLOW_V2_PATH_C_AWAIT_UPLOAD,
  FLOW_V2_PATH_C_BASICS,
  mockCandorAuth
} from './mock-candor-auth'

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

async function openFreshChat(page: Page, goto: (path: string, opts?: { waitUntil?: 'hydration' }) => Promise<unknown>) {
  await page.setViewportSize({ width: 1280, height: 800 })
  // Clear journey BEFORE first /chat mount — entry now POSTs /conversations on
  // mount; a leftover reportId would attach＋stream and steal path before 進站三選.
  await goto('/', { waitUntil: 'hydration' })
  await page.evaluate(() => {
    localStorage.removeItem('candor.unpaid.journey')
  })
  await goto('/chat', { waitUntil: 'hydration' })
  await expect(page.getByTestId('chat-transcript')).toBeVisible({ timeout: 20_000 })
}

/** Entry chips from greeting.reply_actions path_switch (codes a／b／c). */
async function selectEntryPath(page: Page, path: 'A' | 'B' | 'C') {
  const code = path.toLowerCase()
  const chip = page.getByTestId(`chat-quiz-option-${code}`)
  await expect(chip).toBeVisible({ timeout: 15_000 })
  await chip.click()
  // onChoice fires void selectConversationPath — wait until entry `c` chip clears
  // (path POST done). Path C flow_prompt may still show a／b switch chips.
  await expect(page.getByTestId('chat-quiz-option-c')).toHaveCount(0, { timeout: 15_000 })
}

async function finishGoalSelect(page: Page) {
  await expect(page.getByTestId('chat-quiz-option-sleep')).toBeVisible({ timeout: 15_000 })
  await page.getByTestId('chat-quiz-option-sleep').click()
  await page.getByTestId('chat-quiz-confirm').click()
  await expect(page.getByTestId('chat-quiz-confirm')).toHaveCount(0, { timeout: 15_000 })
}

async function sendChatLine(page: Page, text: string) {
  const input = page.getByTestId('chat-input')
  await expect(input).toBeVisible({ timeout: 15_000 })
  await input.fill(text)
  await page.getByTestId('chat-send').click()
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

    const transcript = page.getByTestId('chat-transcript')
    await expect(transcript).toContainText(FLOW_V2_GREETING_CONSULT, { timeout: 15_000 })
    await expect(transcript).toContainText('想先從哪裡開始？')
    await expect(page.getByTestId('chat-quiz-option-a')).toBeVisible({ timeout: 15_000 })
    await expect(page.getByTestId('chat-quiz-option-b')).toBeVisible()
    await expect(page.getByTestId('chat-quiz-option-c')).toBeVisible()
    await expect(page.getByTestId('chat-quiz-option-a')).toHaveText('我想聊聊')
    await expect(page.getByTestId('chat-quiz-option-b')).toHaveText('我想諮詢健康方案')
    await expect(page.getByTestId('chat-quiz-option-c')).toHaveText('幫我看報告')
    // 開場白在上、三鈕在下
    const text = await transcript.innerText()
    expect(text.indexOf(FLOW_V2_GREETING_CONSULT)).toBeLessThan(text.indexOf('我想聊聊'))
    await expect(page.getByTestId('chat-submit-expert-review')).toHaveCount(0)
  })

  const removedLocalOpeners = [
    '好的，我們先聊聊',
    '好的，我們來了解你的基本狀況',
    '好的，請上傳近期健檢',
    '你好，想聊什麼都可以',
    '請先上傳血檢或健檢報告；若不傳可改為諮詢健康方案'
  ]

  test('path A：選項當一般訊息送出；開場白在上、三鈕在下', async ({ page, goto }) => {
    test.setTimeout(90_000)
    await mockCandorAuth(page, {
      asMember: true,
      conversationPath: null,
      basicProfileComplete: true
    })
    await seedNoExpertCase(page)
    await openFreshChat(page, goto)

    const before = page.getByTestId('chat-transcript')
    await expect(before).toContainText(FLOW_V2_GREETING_CONSULT, { timeout: 15_000 })
    const beforeText = await before.innerText()
    expect(beforeText.indexOf(FLOW_V2_GREETING_CONSULT)).toBeLessThan(beforeText.indexOf('我想聊聊'))

    await selectEntryPath(page, 'A')

    const transcript = page.getByTestId('chat-transcript')
    await expect(transcript).toContainText('我想聊聊', { timeout: 15_000 })
    await expect(transcript).toContainText(FLOW_V2_GREETING_CONSULT, { timeout: 15_000 })
    const text = await transcript.innerText()
    // 選後仍維持資料庫順序：開場白 → 使用者選項
    expect(text.indexOf(FLOW_V2_GREETING_CONSULT)).toBeLessThan(text.indexOf('我想聊聊'))
    for (const opener of removedLocalOpeners) {
      await expect(transcript).not.toContainText(opener)
    }
    // A：不走 goals；create 也不回 goals chips。
    await expect(page.getByTestId('chat-quiz-option-sleep')).toHaveCount(0)
  })

  test('path B：選項當一般訊息送出 → stream 回 goals；開場白在上、三鈕在下', async ({ page, goto }) => {
    test.setTimeout(90_000)
    await mockCandorAuth(page, {
      asMember: true,
      conversationPath: null,
      basicProfileComplete: false
    })
    await seedNoExpertCase(page)
    await openFreshChat(page, goto)

    const before = page.getByTestId('chat-transcript')
    await expect(before).toContainText(FLOW_V2_GREETING_CONSULT, { timeout: 15_000 })
    const beforeText = await before.innerText()
    expect(beforeText.indexOf(FLOW_V2_GREETING_CONSULT)).toBeLessThan(beforeText.indexOf('我想諮詢健康方案'))

    await selectEntryPath(page, 'B')

    const transcript = page.getByTestId('chat-transcript')
    await expect(transcript).toContainText('我想諮詢健康方案', { timeout: 15_000 })
    await expect(transcript).toContainText(FLOW_V2_GREETING_CONSULT, { timeout: 15_000 })
    const text = await transcript.innerText()
    expect(text.indexOf(FLOW_V2_GREETING_CONSULT)).toBeLessThan(text.indexOf('我想諮詢健康方案'))
    for (const opener of removedLocalOpeners) {
      await expect(transcript).not.toContainText(opener)
    }
    // Goals come from the entry stream reply（not create／not GET next）.
    await expect(page.getByTestId('chat-quiz-option-sleep')).toBeVisible({ timeout: 15_000 })
  })

  test('path C：選完顯示 greeting + flow_prompt 上傳引導，無路徑專屬本地句', async ({ page, goto }) => {
    test.setTimeout(90_000)
    // Keep C copy constants pinned to SPEC（後端回／FE i18n 對齊用）。
    expect(FLOW_V2_PATH_C_AWAIT_UPLOAD).toContain('請上傳血檢或健檢報告')
    expect(FLOW_V2_PATH_C_BASICS).toContain('報告收到了')

    await mockCandorAuth(page, {
      asMember: true,
      conversationPath: null,
      basicProfileComplete: false
    })
    await seedNoExpertCase(page)
    await openFreshChat(page, goto)
    await selectEntryPath(page, 'C')

    const transcript = page.getByTestId('chat-transcript')
    await expect(transcript).toContainText(FLOW_V2_GREETING_CONSULT, { timeout: 15_000 })
    await expect(transcript).toContainText(FLOW_V2_PATH_C_AWAIT_UPLOAD, { timeout: 15_000 })
    for (const opener of removedLocalOpeners) {
      await expect(transcript).not.toContainText(opener)
    }
  })

  test('path A：usable offer_recommend 仍不顯示完成 CTA', async ({ page, goto }) => {
    test.setTimeout(90_000)
    await mockCandorAuth(page, {
      asMember: true,
      conversationPath: null,
      basicProfileComplete: true,
      replyActions: 'offer_recommend'
    })
    await seedNoExpertCase(page)
    await openFreshChat(page, goto)
    await selectEntryPath(page, 'A')

    const input = page.getByTestId('chat-input')
    await input.fill('聊聊睡眠')
    await page.getByTestId('chat-send').click()

    const last = page.getByTestId('chat-last-reply')
    await expect(last).toBeVisible({ timeout: 15_000 })
    await expect(last.getByTestId('chat-submit-expert-review')).toHaveCount(0)
  })

  test('path B：goals 後才問 sex；完成 CTA 依 RA', async ({ page, goto }) => {
    test.setTimeout(90_000)
    await mockCandorAuth(page, {
      asMember: true,
      conversationPath: null,
      basicProfileComplete: false,
      replyActions: 'offer_recommend'
    })
    await seedNoExpertCase(page)
    await openFreshChat(page, goto)
    await selectEntryPath(page, 'B')

    await finishGoalSelect(page)
    await expect(page.getByTestId('chat-quiz-option-F')).toBeVisible({ timeout: 15_000 })
    await expect(page.getByTestId('chat-submit-expert-review')).toHaveCount(0)
  })

  test('path B：基本齊 + usable offer_recommend → 完成 CTA；文案不改壞', async ({ page, goto }) => {
    test.setTimeout(90_000)
    await mockCandorAuth(page, {
      asMember: true,
      conversationPath: null,
      basicProfileComplete: true,
      replyActions: 'offer_recommend'
    })
    await seedNoExpertCase(page)
    await openFreshChat(page, goto)
    await selectEntryPath(page, 'B')

    await finishGoalSelect(page)
    await sendChatLine(page, '請給方案')

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
      conversationPath: null,
      basicProfileComplete: true,
      replyActions: 'none'
    })
    await seedNoExpertCase(page)
    await openFreshChat(page, goto)
    await selectEntryPath(page, 'B')

    await finishGoalSelect(page)
    await sendChatLine(page, '還有嗎')

    const last = page.getByTestId('chat-last-reply')
    await expect(last).toBeVisible({ timeout: 15_000 })
    await expect(last.getByTestId('chat-submit-expert-review')).toHaveCount(0)
  })

  test('path C：flow_prompt 上傳引導＋A／B 兩鈕（無 checkup）', async ({ page, goto }) => {
    test.setTimeout(90_000)
    await mockCandorAuth(page, {
      asMember: true,
      conversationPath: null,
      basicProfileComplete: false
    })
    await seedNoExpertCase(page)
    await openFreshChat(page, goto)
    await selectEntryPath(page, 'C')

    const transcript = page.getByTestId('chat-transcript')
    await expect(transcript).toContainText(FLOW_V2_PATH_C_AWAIT_UPLOAD, { timeout: 15_000 })
    const last = page.getByTestId('chat-last-reply')
    await expect(last.getByTestId('chat-message-checkup')).toHaveCount(0)
    await expect(last.getByTestId('chat-message-upload')).toBeVisible()
    await expect(last.getByTestId('chat-quiz-option-a')).toHaveText('我想聊聊')
    await expect(last.getByTestId('chat-quiz-option-b')).toHaveText('我想諮詢健康方案')
  })
})
