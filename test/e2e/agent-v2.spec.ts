import { expect, test } from '@nuxt/test-utils/playwright'
import { e2eArtifactPath } from './helpers/artifacts-dir'
import { mockCandorAuth } from './mock-candor-auth'
import { mockAgentV2Api } from './mock-agent-v2'

const REPORT_ID = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'

test.beforeEach(async ({ page }) => {
  await mockCandorAuth(page, { asMember: true })
  await page.addInitScript(() => {
    localStorage.removeItem('candor.agent.v2.conversationId')
  })
})

test('agent v2 ready state shows offer_recommend from actions on /chat/v2', async ({
  page,
  goto
}) => {
  await mockAgentV2Api(page, 'ready')
  await page.setViewportSize({ width: 390, height: 844 })
  await goto('/chat/v2', { waitUntil: 'hydration' })

  await expect(page.getByTestId('agent-v2-page')).toBeVisible()
  await expect(page.getByTestId('chat-transcript')).toBeVisible({ timeout: 15_000 })

  const input = page.getByTestId('chat-input')
  await expect(input).toBeEnabled({ timeout: 15_000 })
  await input.fill('我想取得方案')
  await page.getByTestId('chat-send').click()

  const offer = page.getByTestId('chat-view-recommend')
  await expect(offer).toBeVisible({ timeout: 15_000 })
  await expect(offer).toHaveText('取得專屬保健品方案')
  await expect(page.getByTestId('chat-last-reply')).toContainText('三要件')

  await page.screenshot({
    path: e2eArtifactPath('agent-v2-ready-390.png'),
    fullPage: true
  })

  await offer.click()
  await expect(page).toHaveURL(/\/app\/recommendations/, { timeout: 15_000 })
})

test('agent v2 shows ReportDataDock with explainHighlights when a report exists', async ({
  page,
  goto
}) => {
  await mockAgentV2Api(page, 'ready')

  // Prefer GET /health-reports list → GET /{id} (v1 read APIs). Register after
  // mockCandorAuth so these handlers win (Playwright LIFO).
  await page.route('**/api/v1/health-reports**', async (route) => {
    const request = route.request()
    if (request.method() !== 'GET') {
      await route.fallback()
      return
    }
    const path = new URL(request.url()).pathname.replace(/\/$/, '')
    const ok = (data: unknown) => route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ status: 'success', data })
    })

    if (path.endsWith('/health-reports')) {
      await ok({
        reports: [{
          id: REPORT_ID,
          status: 'ready',
          created_at: '2026-01-01T00:00:00Z',
          page_count: 1
        }],
        total: 1
      })
      return
    }

    if (path.endsWith(`/health-reports/${REPORT_ID}`)) {
      await ok({
        id: REPORT_ID,
        status: 'ready',
        page_count: 1,
        extraction_confidence: 0.9,
        results: [{
          id: 'result-v2-dock-1',
          raw_name: 'Vitamin D3',
          name_zh: '維生素 D3',
          value_numeric: 31.8,
          unit: 'ng/mL',
          ref_low: 50,
          ref_high: 80,
          range_status: 'low'
        }]
      })
      return
    }

    await route.fallback()
  })

  await page.setViewportSize({ width: 390, height: 844 })
  await goto('/chat/v2', { waitUntil: 'hydration' })

  await expect(page.getByTestId('agent-v2-page')).toBeVisible()
  await expect(page.getByTestId('chat-report-dock')).toBeVisible({ timeout: 15_000 })
  await expect(page.getByTestId('chat-report-interpret')).toBeVisible({ timeout: 15_000 })
  await expect(page.getByTestId('chat-report-interpret')).toHaveText('請助理說明重點')
  await expect(page.getByTestId('chat-report-interpret')).toBeEnabled()

  await page.screenshot({
    path: e2eArtifactPath('agent-v2-report-dock-390.png'),
    fullPage: true
  })
})

test('agent v2 gathering state has no offer_recommend until backend sends it', async ({
  page,
  goto
}) => {
  await mockAgentV2Api(page, 'gathering')
  await goto('/chat/v2', { waitUntil: 'hydration' })

  await expect(page.getByTestId('chat-transcript')).toBeVisible({ timeout: 15_000 })

  await page.getByTestId('chat-input').fill('先聊聊')
  await page.getByTestId('chat-send').click()
  await expect(page.getByTestId('chat-transcript')).toContainText('先聊聊')
  await expect(page.getByTestId('chat-view-recommend')).toHaveCount(0)
})

test('existing home and chat surfaces have no agent v2 entry', async ({ page, goto }) => {
  await mockAgentV2Api(page, 'ready')
  await goto('/', { waitUntil: 'hydration' })
  await expect(page.getByTestId('agent-v2-page')).toHaveCount(0)
  await expect(page.locator('a[href*="/chat/v2"]')).toHaveCount(0)
  await expect(page.locator('a[href*="/app/v2"]')).toHaveCount(0)

  await goto('/chat', { waitUntil: 'hydration' })
  await expect(page.getByTestId('chat-transcript')).toBeVisible({ timeout: 20_000 })
  await expect(page.locator('a[href*="/chat/v2"]')).toHaveCount(0)
  await expect(page.locator('a[href*="/app/v2"]')).toHaveCount(0)
  await expect(page.getByTestId('agent-v2-page')).toHaveCount(0)
})
