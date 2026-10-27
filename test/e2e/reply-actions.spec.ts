import { expect, test } from '@nuxt/test-utils/playwright'
import { mockCandorAuth } from './mock-candor-auth'

async function sendChatLine(
  page: import('@playwright/test').Page,
  text: string
) {
  const input = page.getByTestId('chat-input')
  await expect(input).toBeVisible({ timeout: 15_000 })
  await input.fill(text)
  await page.getByTestId('chat-send').click()
}

test.describe('reply_actions v0.1 CTAs', () => {
  test('/chat: offer_recommend → 提交專家判讀; legacy chips/upload deduped', async ({ page, goto }) => {
    test.setTimeout(90_000)
    await mockCandorAuth(page, { asMember: true, replyActions: 'offer_recommend' })
    await page.setViewportSize({ width: 1280, height: 800 })
    await goto('/chat', { waitUntil: 'hydration' })
    await page.evaluate(() => localStorage.removeItem('candor.unpaid.journey'))

    await sendChatLine(page, '請依報告給建議')

    const last = page.getByTestId('chat-last-reply')
    await expect(last.getByTestId('chat-submit-expert-review')).toBeVisible({ timeout: 15_000 })
    await expect(last.getByTestId('chat-submit-expert-review')).toHaveText('提交專家判讀')
    await expect(last.getByTestId('chat-view-recommend')).toHaveCount(0)
    // Usable reply_actions: ask_report → upload; legacy options chip must not appear.
    await expect(last.getByTestId('chat-message-upload')).toBeVisible()
    await expect(last.getByTestId('chat-quiz-option-legacy_chip')).toHaveCount(0)
    await expect(last.getByTestId('chat-message-checkup')).toHaveCount(0)
  })

  test('/chat-ai: same offer_recommend → 查看推薦方案', async ({ page, goto }) => {
    test.setTimeout(90_000)
    await mockCandorAuth(page, { asMember: true, replyActions: 'offer_recommend' })
    await page.setViewportSize({ width: 1280, height: 800 })
    await goto('/chat-ai', { waitUntil: 'hydration' })
    await page.evaluate(() => localStorage.removeItem('candor.unpaid.journey'))

    await sendChatLine(page, '請依報告給建議')

    const last = page.getByTestId('chat-last-reply')
    await expect(last.getByTestId('chat-view-recommend')).toBeVisible({ timeout: 15_000 })
    await expect(last.getByTestId('chat-view-recommend')).toHaveText('查看推薦方案')
    await expect(last.getByTestId('chat-submit-expert-review')).toHaveCount(0)
  })

  test('ask_vitals renders numeric card; degraded falls back to legacy upload', async ({ page, goto }) => {
    test.setTimeout(90_000)
    await mockCandorAuth(page, { asMember: true, replyActions: 'ask_vitals' })
    await page.setViewportSize({ width: 1280, height: 800 })
    await goto('/chat', { waitUntil: 'hydration' })
    await page.evaluate(() => localStorage.removeItem('candor.unpaid.journey'))

    await sendChatLine(page, '我想補充基本資料')
    const last = page.getByTestId('chat-last-reply')
    await expect(last.getByTestId('chat-vitals-card')).toBeVisible({ timeout: 15_000 })
    await expect(last.getByTestId('chat-vitals-age')).toBeVisible()
    await expect(last.getByTestId('chat-quiz-option-legacy_chip')).toHaveCount(0)

    // Degraded path: remount with degraded mock and assert legacy upload.
    await mockCandorAuth(page, { asMember: true, replyActions: 'degraded' })
    await goto('/chat', { waitUntil: 'hydration' })
    await page.evaluate(() => localStorage.removeItem('candor.unpaid.journey'))
    await sendChatLine(page, '再試一次')
    await expect(page.getByTestId('chat-last-reply').getByTestId('chat-message-upload')).toBeVisible({
      timeout: 15_000
    })
    await expect(page.getByTestId('chat-vitals-card')).toHaveCount(0)
  })
})
