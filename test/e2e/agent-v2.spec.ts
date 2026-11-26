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

  // LY5: greeting + actions hydrate on create (no need to send first).
  const offer = page.getByTestId('chat-view-recommend')
  await expect(offer).toBeVisible({ timeout: 15_000 })
  await expect(offer).toHaveText('取得專屬保健品方案')
  await expect(page.getByTestId('chat-last-reply')).toContainText('三要件')

  const input = page.getByTestId('chat-input')
  await expect(input).toBeEnabled({ timeout: 15_000 })
  await input.fill('我想取得方案')
  await page.getByTestId('chat-send').click()
  await expect(page.getByTestId('chat-view-recommend')).toBeVisible({ timeout: 15_000 })

  await page.screenshot({
    path: e2eArtifactPath('agent-v2-ready-390.png'),
    fullPage: true
  })

  await page.getByTestId('chat-view-recommend').click()
  await expect(page).toHaveURL(/\/app\/recommendations/, { timeout: 15_000 })
  await expect(page).toHaveURL(/agent_v2_conversation_id=/, { timeout: 5_000 })
  await expect(page).toHaveURL(/flow=standard/)
})

test('agent v2 reload restores greeting actions from GET hydrate', async ({
  page,
  goto
}) => {
  await mockAgentV2Api(page, 'ready')
  await goto('/chat/v2', { waitUntil: 'hydration' })
  await expect(page.getByTestId('chat-view-recommend')).toBeVisible({ timeout: 15_000 })

  await page.reload({ waitUntil: 'domcontentloaded' })
  await expect(page.getByTestId('agent-v2-page')).toBeVisible()
  await expect(page.getByTestId('chat-view-recommend')).toBeVisible({ timeout: 15_000 })
  await expect(page.getByTestId('chat-last-reply')).toContainText('三要件')
})

test('agent v2 failed message shows retry CTA and recovers', async ({
  page,
  goto
}) => {
  await mockAgentV2Api(page, 'fail_once')
  await goto('/chat/v2', { waitUntil: 'hydration' })
  await expect(page.getByTestId('chat-input')).toBeEnabled({ timeout: 15_000 })

  await page.getByTestId('chat-input').fill('這次會失敗一次')
  await page.getByTestId('chat-send').click()

  const retry = page.getByTestId('chat-report-retry')
  await expect(retry).toBeVisible({ timeout: 15_000 })
  await expect(retry).toHaveText('再試一次')
  await retry.click()

  await expect(page.getByTestId('chat-transcript')).toContainText('已收到', {
    timeout: 15_000
  })
  await expect(page.getByTestId('chat-view-recommend')).toBeVisible({ timeout: 15_000 })
})

test('agent v2 shows citations and expert booking from actions (LY6)', async ({
  page,
  goto
}) => {
  await mockAgentV2Api(page, 'citations')
  await goto('/chat/v2', { waitUntil: 'hydration' })

  await expect(page.getByTestId('agent-v2-citations')).toBeVisible({ timeout: 15_000 })
  await expect(page.getByTestId('agent-v2-citation')).toContainText('維生素 D')
  await expect(page.getByTestId('chat-expert-booking')).toBeVisible({ timeout: 15_000 })
  await expect(page.getByTestId('chat-view-recommend')).toBeVisible()
})

test('agent v2 dock explainHighlights POSTs explain_highlights action (LY6)', async ({
  page,
  goto
}) => {
  await mockAgentV2Api(page, 'citations')

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
          id: 'result-v2-explain-1',
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

  let explainPosted = false
  page.on('request', (req) => {
    if (req.method() !== 'POST' || !req.url().includes('/api/v2/conversations/')) {
      return
    }
    if (!req.url().includes('/actions')) {
      return
    }
    try {
      const body = req.postDataJSON() as { key?: string }
      if (body?.key === 'explain_highlights') {
        explainPosted = true
      }
    } catch {
      // ignore
    }
  })

  await goto('/chat/v2', { waitUntil: 'hydration' })
  await expect(page.getByTestId('chat-report-interpret')).toBeVisible({ timeout: 15_000 })
  await page.getByTestId('chat-report-interpret').click()
  await expect(page.getByTestId('chat-transcript')).toContainText('報告重點說明', {
    timeout: 15_000
  })
  expect(explainPosted).toBe(true)
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

test('agent v2 projects ask_vitals／ask_report／confirm_report_date from actions', async ({
  page,
  goto
}) => {
  await mockAgentV2Api(page, 'collecting_actions')
  await page.setViewportSize({ width: 390, height: 844 })
  await goto('/chat/v2', { waitUntil: 'hydration' })

  await expect(page.getByTestId('chat-transcript')).toBeVisible({ timeout: 15_000 })
  await page.getByTestId('chat-input').fill('開始補資料')
  await page.getByTestId('chat-send').click()

  // AskVitals card (age picker) from ask_vitals action.
  await expect(page.getByTestId('chat-vitals-age-picker')).toBeVisible({ timeout: 15_000 })
  // ask_report paints upload CTA (disabled until LY2 enables canOfferUpload for v2).
  await expect(page.getByTestId('chat-message-upload')).toBeVisible({ timeout: 15_000 })
  // confirm_report_date chip → POST /actions only.
  const confirmDate = page.getByTestId('chat-quiz-option-confirm_report_date')
  await expect(confirmDate).toBeVisible({ timeout: 15_000 })
  await confirmDate.click()
  await expect(page.getByTestId('chat-transcript')).toContainText('報告日期已記下', {
    timeout: 15_000
  })
  await expect(page.getByTestId('chat-view-recommend')).toHaveCount(0)

  await page.screenshot({
    path: e2eArtifactPath('agent-v2-collecting-actions-390.png'),
    fullPage: true
  })
})

test('agent v2 projects ask_goal chips from actions', async ({ page, goto }) => {
  await mockAgentV2Api(page, 'goals')
  await goto('/chat/v2', { waitUntil: 'hydration' })

  await expect(page.getByTestId('chat-transcript')).toBeVisible({ timeout: 15_000 })
  await page.getByTestId('chat-input').fill('選目標')
  await page.getByTestId('chat-send').click()

  await expect(page.getByTestId('chat-quiz-option-sleep')).toBeVisible({ timeout: 15_000 })
  await expect(page.getByTestId('chat-quiz-confirm')).toBeVisible({ timeout: 15_000 })
  await page.getByTestId('chat-quiz-option-sleep').click()
  await expect(page.getByTestId('chat-quiz-option-sleep')).toHaveClass(/is-selected/)
})

test('agent v2 goals confirm POSTs /profile/answers then refreshes v2 (no v1 conversation)', async ({
  page,
  goto
}) => {
  await mockAgentV2Api(page, 'goals')

  let profileAnswerBody: Record<string, unknown> | null = null
  let sawV1Conversation = false
  let v2RefreshAfterGoals = false

  await page.route('**/api/v1/conversation**', async (route) => {
    sawV1Conversation = true
    await route.fulfill({
      status: 500,
      contentType: 'application/json',
      body: JSON.stringify({
        status: 'failed',
        error_message: 'v2 must not call v1 conversation',
        error_code: 'forbidden'
      })
    })
  })

  await page.route('**/api/v1/profile/answers', async (route) => {
    if (route.request().method() !== 'POST') {
      await route.fallback()
      return
    }
    profileAnswerBody = route.request().postDataJSON() as Record<string, unknown>
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        status: 'success',
        data: {
          saved: true,
          profile_gaps: [],
          next_question: { done: true }
        }
      })
    })
  })

  await page.route('**/api/v2/conversations/*/messages', async (route) => {
    if (route.request().method() === 'POST' && profileAnswerBody) {
      v2RefreshAfterGoals = true
    }
    await route.fallback()
  })

  await goto('/chat/v2', { waitUntil: 'hydration' })
  await expect(page.getByTestId('chat-transcript')).toBeVisible({ timeout: 15_000 })
  await page.getByTestId('chat-input').fill('選目標')
  await page.getByTestId('chat-send').click()

  await expect(page.getByTestId('chat-quiz-option-sleep')).toBeVisible({ timeout: 15_000 })
  await page.getByTestId('chat-quiz-option-sleep').click()
  await page.getByTestId('chat-quiz-confirm').click()

  await expect.poll(() => profileAnswerBody !== null).toBe(true)
  expect(profileAnswerBody?.gap_code).toBe('goals')
  expect(profileAnswerBody?.value).toEqual(['sleep'])
  expect(profileAnswerBody?.conversation_id).toBeUndefined()
  await expect.poll(() => v2RefreshAfterGoals).toBe(true)
  expect(sawV1Conversation).toBe(false)
})

test('agent v2 member upload uses v1 health-reports then refreshes v2 (no v1 conversation)', async ({
  page,
  goto
}) => {
  await mockAgentV2Api(page, 'collecting_actions')

  const uploadedReportId = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'
  let sawV1Conversation = false
  let sawHealthReportPost = false
  let v2MessageAfterUpload = false

  await page.route('**/api/v1/conversation**', async (route) => {
    sawV1Conversation = true
    await route.fulfill({
      status: 500,
      contentType: 'application/json',
      body: JSON.stringify({
        status: 'failed',
        error_message: 'v2 must not call v1 conversation',
        error_code: 'forbidden'
      })
    })
  })

  await page.route('**/api/v1/health-reports**', async (route) => {
    const request = route.request()
    const method = request.method()
    const path = new URL(request.url()).pathname.replace(/\/$/, '')
    const ok = (data: unknown, status = 200) => route.fulfill({
      status,
      contentType: 'application/json',
      body: JSON.stringify({ status: 'success', data })
    })

    if (method === 'POST' && path.endsWith('/health-reports')) {
      sawHealthReportPost = true
      await ok({
        id: uploadedReportId,
        status: 'ready',
        page_count: 1
      }, 201)
      return
    }

    if (method === 'GET' && path.endsWith(`/health-reports/${uploadedReportId}`)) {
      await ok({
        id: uploadedReportId,
        status: 'ready',
        page_count: 1,
        results: [{
          id: 'result-upload-1',
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

    if (method === 'GET' && path.endsWith('/health-reports')) {
      await ok({ reports: [], total: 0 })
      return
    }

    await route.fallback()
  })

  // After upload, v2 sendMessage should fire (bindAgentV2Report ack).
  await page.route('**/api/v2/conversations/*/messages', async (route) => {
    if (route.request().method() === 'POST' && sawHealthReportPost) {
      v2MessageAfterUpload = true
    }
    await route.fallback()
  })

  await page.setViewportSize({ width: 390, height: 844 })
  await goto('/chat/v2', { waitUntil: 'hydration' })

  await expect(page.getByTestId('chat-transcript')).toBeVisible({ timeout: 15_000 })
  await page.getByTestId('chat-input').fill('我要上傳')
  await page.getByTestId('chat-send').click()

  const uploadBtn = page.getByTestId('chat-message-upload')
  await expect(uploadBtn).toBeVisible({ timeout: 15_000 })
  await expect(uploadBtn).toBeEnabled()

  // Attach menu → PDF path (member).
  await uploadBtn.click()
  await expect(page.getByTestId('chat-attach-pdf')).toBeVisible({ timeout: 5_000 })
  await page.getByTestId('chat-attach-pdf').click()

  // Feed a fake PDF file into the hidden input (opened by pickPdf).
  await page.getByTestId('chat-upload-input').setInputFiles({
    name: 'report.pdf',
    mimeType: 'application/pdf',
    buffer: Buffer.from('%PDF-1.4 fake')
  })

  await expect(page.getByTestId('chat-report-dock')).toBeVisible({ timeout: 15_000 })
  await expect(page.getByTestId('chat-report-interpret')).toBeVisible({ timeout: 15_000 })
  await expect.poll(() => sawHealthReportPost).toBe(true)
  await expect.poll(() => v2MessageAfterUpload).toBe(true)
  expect(sawV1Conversation).toBe(false)
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
