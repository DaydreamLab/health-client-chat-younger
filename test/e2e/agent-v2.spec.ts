import { expect, test } from '@nuxt/test-utils/playwright'
import { e2eArtifactPath } from './helpers/artifacts-dir'
import { mockCandorAuth } from './mock-candor-auth'
import { mockAgentV2Api } from './mock-agent-v2'

test.beforeEach(async ({ page }) => {
  await mockCandorAuth(page, { asMember: true })
  await page.addInitScript(() => {
    localStorage.removeItem('candor.agent.v2.conversationId')
  })
})

test('agent v2 ready state shows progress and offer_recommend from actions', async ({
  page,
  goto
}) => {
  await mockAgentV2Api(page, 'ready')
  await page.setViewportSize({ width: 390, height: 844 })
  await goto('/app/v2', { waitUntil: 'hydration' })

  await expect(page.getByTestId('agent-v2-page')).toBeVisible()
  await expect(page.getByTestId('agent-v2-panel')).toBeVisible({ timeout: 15_000 })
  await expect(page.getByTestId('agent-v2-progress-profile')).toHaveAttribute('data-done', '1')
  await expect(page.getByTestId('agent-v2-progress-report')).toHaveAttribute('data-done', '1')
  await expect(page.getByTestId('agent-v2-progress-goals')).toHaveAttribute('data-done', '1')

  const input = page.getByTestId('agent-v2-input')
  await expect(input).toBeEnabled({ timeout: 15_000 })
  await input.fill('我想取得方案')
  await page.getByTestId('agent-v2-send').click()

  const offer = page.getByTestId('agent-v2-action-offer_recommend')
  await expect(offer).toBeVisible({ timeout: 15_000 })
  await expect(offer).toHaveText('取得專屬保健品方案')
  await expect(page.getByTestId('agent-v2-message-assistant').last()).toContainText('三要件')

  await page.screenshot({
    path: e2eArtifactPath('agent-v2-ready-390.png'),
    fullPage: true
  })

  await offer.click()
  await expect(page).toHaveURL(/\/app\/recommendations/, { timeout: 15_000 })
})

test('agent v2 gathering state has no offer_recommend until backend sends it', async ({
  page,
  goto
}) => {
  await mockAgentV2Api(page, 'gathering')
  await goto('/app/v2', { waitUntil: 'hydration' })

  await expect(page.getByTestId('agent-v2-panel')).toBeVisible({ timeout: 15_000 })
  await expect(page.getByTestId('agent-v2-progress-profile')).toHaveAttribute('data-done', '0')
  await expect(page.getByTestId('agent-v2-progress-report')).toHaveAttribute('data-done', '0')
  await expect(page.getByTestId('agent-v2-progress-goals')).toHaveAttribute('data-done', '0')

  await page.getByTestId('agent-v2-input').fill('先聊聊')
  await page.getByTestId('agent-v2-send').click()
  await expect(page.getByTestId('agent-v2-message-user').last()).toContainText('先聊聊')
  await expect(page.getByTestId('agent-v2-action-offer_recommend')).toHaveCount(0)
})

test('existing home and chat surfaces have no agent v2 entry', async ({ page, goto }) => {
  await mockAgentV2Api(page, 'ready')
  await goto('/', { waitUntil: 'hydration' })
  await expect(page.getByTestId('agent-v2-page')).toHaveCount(0)
  await expect(page.locator('a[href*="/app/v2"]')).toHaveCount(0)

  await goto('/chat', { waitUntil: 'hydration' })
  await expect(page.getByTestId('chat-transcript')).toBeVisible({ timeout: 20_000 })
  await expect(page.locator('a[href*="/app/v2"]')).toHaveCount(0)
  await expect(page.getByTestId('agent-v2-panel')).toHaveCount(0)
})
