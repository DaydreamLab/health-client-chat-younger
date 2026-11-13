import type { Page, Route } from '@playwright/test'
import { expect, test } from '@nuxt/test-utils/playwright'
import { mockCandorAuth } from './mock-candor-auth'

/** Case conversation that has a reviewed expert case. */
const caseConversationId = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
const caseOrderId = 'cccccccc-cccc-cccc-cccc-cccccccccccc'
const caseReportId = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'
const expertReviewId = 'ffffffff-ffff-ffff-ffff-ffffffffffff'

const reviewedPackages = [
  {
    package_plan_code: 'basic',
    package_plan_name: '基礎保養',
    price: 1280,
    period_days: 30,
    items: [
      {
        rank: 1,
        sellable_item_id: 'dddddddd-dddd-dddd-dddd-dddddddddd01',
        code: 'vitamin_d',
        name: '維生素 D',
        daily_dose: 1,
        is_core: true
      }
    ],
    used_amount: 280,
    remaining: 1000,
    composition_hash: 'sha256:basic-case',
    rationale: {
      headline: '評估與總覽',
      body: '案件對話方案',
      disclaimer: '本建議僅供健康管理參考，非醫療診斷或療效保證。',
      copy_mode: 'template',
      groups: [],
      items: [],
      claim_guard_hits: []
    }
  }
]

/**
 * GET expert-review: 200 for the reviewed case conversation.
 */
async function mockExpertReviewByConversation(page: Page) {
  await page.route('**/api/v1/conversation/*/expert-review', async (route: Route) => {
    const method = route.request().method()
    if (method !== 'GET' && method !== 'POST') {
      await route.fallback()
      return
    }
    const path = new URL(route.request().url()).pathname
    const match = path.match(/\/conversation\/([^/]+)\/expert-review\/?$/)
    const conversationId = match?.[1] ?? ''
    if (conversationId !== caseConversationId) {
      await route.fulfill({
        status: 404,
        contentType: 'application/json',
        body: JSON.stringify({
          status: 'failed',
          error_code: 'not_found',
          error_message: 'Expert review not found.',
          error_data: null
        })
      })
      return
    }
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        status: 'success',
        data: {
          id: expertReviewId,
          conversation_id: caseConversationId,
          health_report_id: caseReportId,
          status: 'reviewed',
          recommendation_run_id: 'run-case-1',
          created_at: '2026-10-01T00:00:00+00:00',
          reviewed_at: '2026-10-02T00:00:00+00:00',
          order_id: caseOrderId,
          packages: reviewedPackages,
          summary: null,
          weight_set: { id: 'ws-1', version: '1.0.0' }
        }
      })
    })
  })
}

async function mockFinalizedExpertOrder(page: Page) {
  await page.route(`**/api/v1/order/${caseOrderId}`, async (route: Route) => {
    if (route.request().method() !== 'GET') {
      await route.fallback()
      return
    }
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        status: 'success',
        data: {
          id: caseOrderId,
          order_no: 'C-EXPERT-1',
          status: 'confirmed',
          payment_status: 'paid',
          amount_total: 3980,
          package_plan_name: null,
          expert_plan_name: '專家方案',
          lines: [
            {
              kind: 'expert_plan',
              expert_plan_code: 'basic',
              expert_plan_name: '專家方案',
              expert_plan_price: 3980
            }
          ],
          package: null,
          recipient: {
            name: '林晏婷',
            phone: '0912345678',
            address: '台北市大安區',
            email: 'guest@example.com'
          },
          invoice_type: 'member',
          created_at: '2026-10-01T00:00:00+00:00',
          confirmed_at: '2026-10-01T00:05:00+00:00',
          payments: [],
          conversation_id: caseConversationId,
          expert_case_id: expertReviewId,
          expert_case_status: 'reviewed',
          expert_case_phase: 'finalized',
          expert_case_review: {
            id: expertReviewId,
            status: 'reviewed',
            conversation_id: caseConversationId
          },
          refund_request_status: null,
          refund_status: null,
          refund_blocked_reason: null,
          shipment_status: null
        }
      })
    })
  })
}

test.describe('health page + order → expert-cases', () => {
  test('/app no longer lists expert review records', async ({ page, goto }) => {
    test.setTimeout(60_000)
    await page.setViewportSize({ width: 1280, height: 800 })
    await mockCandorAuth(page, { asMember: true })

    await goto('/app', { waitUntil: 'hydration' })
    await expect(page.getByTestId('health-body')).toBeVisible({ timeout: 15_000 })
    await expect(page.getByTestId('health-review-records')).toHaveCount(0)
    await expect(page.getByTestId('health-review-view-recommend')).toHaveCount(0)
    await expect(page.getByTestId('health-view-recommend')).toHaveCount(0)
    await expect(page.getByTestId('health-reports')).toBeVisible()
  })

  test('from order detail, view final plan opens case finalized page', async ({
    page,
    goto
  }) => {
    test.setTimeout(90_000)
    await page.setViewportSize({ width: 1280, height: 800 })
    await mockCandorAuth(page, { asMember: true })
    await mockExpertReviewByConversation(page)
    await mockFinalizedExpertOrder(page)

    await goto(`/app/orders/${caseOrderId}`, { waitUntil: 'hydration' })
    await expect(page.getByTestId('order-detail')).toBeVisible({ timeout: 15_000 })
    await expect(page.getByTestId('order-view-final-plan')).toBeVisible()

    const expertReviewGet = page.waitForRequest((request) => {
      if (request.method() !== 'GET') {
        return false
      }
      return request.url().includes(`/conversation/${caseConversationId}/expert-review`)
    })

    await page.getByTestId('order-view-final-plan').click()
    const hit = await expertReviewGet
    expect(hit.url()).toContain(`/conversation/${caseConversationId}/expert-review`)

    await expect(page).toHaveURL(new RegExp(`/app/expert-cases/${caseConversationId}`))
    await expect(page.getByTestId('expert-plan-result')).toBeVisible({ timeout: 15_000 })
    await expect(page.getByTestId('package-plan-basic')).toBeVisible({ timeout: 15_000 })
    await expect(page.getByTestId('package-plan-basic')).toContainText('基礎保養')
    await expect(page.getByTestId('recommendation-path-choice')).toHaveCount(0)
  })
})
