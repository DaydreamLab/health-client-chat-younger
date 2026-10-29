import type { Page, Route } from '@playwright/test'
import { expect, test } from '@nuxt/test-utils/playwright'
import { mockCandorAuth } from './mock-candor-auth'

/** Case conversation that has a reviewed expert case (list row). */
const caseConversationId = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
/** Newer chat the member opened after submitting the case (no expert-review). */
const latestConversationId = '7b95b98e-7b95-7b95-7b95-7b95b98e7b95'
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
        unit_price: 9,
        daily_dose: 1,
        monthly_cost: 280,
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

async function seedLatestConversationJourney(page: Page) {
  await page.addInitScript((journey) => {
    localStorage.setItem('candor.unpaid.journey', JSON.stringify(journey))
  }, {
    messages: [],
    hasAnalysis: true,
    selectedPackageCode: null,
    conversationId: latestConversationId,
    reportId: caseReportId,
    reportDockOpen: false,
    reportDockCollapsed: false,
    reportInterpretSent: true,
    selectedPackage: null,
    packageConfirmed: false,
    goalSelectActive: false,
    reportAskActive: false,
    goalOptions: [],
    selectedCodes: ['sleep'],
    quizActive: false,
    activeQuestion: null,
    postQuizGuided: false,
    profileGaps: [],
    clarifyingGoals: [],
    expertReviewStatus: 'none',
    conversationPath: 'C',
    pathCAwaitingUpload: false
  })
}

/**
 * GET expert-review: 200 only for the reviewed case conversation;
 * latest (post-submit) conversation → 404 not_found (prod bug shape).
 */
async function mockExpertReviewByConversation(page: Page) {
  await page.route('**/api/v1/conversation/*/expert-review', async (route: Route) => {
    const method = route.request().method()
    if (method !== 'GET' && method !== 'POST') {
      await route.fallback()
      return
    }
    const url = route.request().url()
    const match = url.match(/\/conversation\/([^/]+)\/expert-review/)
    const conversationId = match?.[1] ?? ''

    if (method === 'POST') {
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({
          status: 'success',
          data: {
            id: expertReviewId,
            conversation_id: conversationId,
            health_report_id: caseReportId,
            status: 'awaiting_review',
            recommendation_run_id: 'cccccccc-cccc-cccc-cccc-cccccccccccc',
            created_at: '2026-01-01T00:00:00Z',
            updated_at: '2026-01-01T00:00:00Z'
          }
        })
      })
      return
    }

    if (conversationId !== caseConversationId) {
      await route.fulfill({
        status: 404,
        contentType: 'application/json',
        body: JSON.stringify({
          status: 'failed',
          error_message: 'Not found',
          error_code: 'not_found',
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
          recommendation_run_id: 'cccccccc-cccc-cccc-cccc-cccccccccccc',
          created_at: '2026-01-01T00:00:00Z',
          updated_at: '2026-01-01T01:00:00Z',
          reviewed_at: '2026-01-01T01:00:00Z',
          packages: reviewedPackages,
          weight_set: { id: 'ws-e2e', version: '0.1.0' },
          summary: {
            top_domains: [],
            data_gaps: [],
            profile_gaps: [],
            strategy_code: 'focus_abnormal',
            message: null
          }
        }
      })
    })
  })
}

test.describe('health review → recommendations (focus case conversation)', () => {
  test('from /app review row, view recommend hits case conversation expert-review', async ({
    page,
    goto
  }) => {
    test.setTimeout(90_000)
    await page.setViewportSize({ width: 1280, height: 800 })
    await mockCandorAuth(page, { asMember: true })
    await mockExpertReviewByConversation(page)
    await seedLatestConversationJourney(page)

    await goto('/app', { waitUntil: 'hydration' })
    await expect(page.getByTestId(`health-review-card-${expertReviewId}`)).toBeVisible({
      timeout: 15_000
    })
    await expect(page.getByTestId('health-review-view-recommend')).toBeVisible()

    const expertReviewGet = page.waitForRequest((request) => {
      if (request.method() !== 'GET') {
        return false
      }
      return request.url().includes(`/conversation/${caseConversationId}/expert-review`)
    })

    await page.getByTestId('health-review-view-recommend').click()
    const hit = await expertReviewGet
    expect(hit.url()).toContain(`/conversation/${caseConversationId}/expert-review`)
    expect(hit.url()).not.toContain(latestConversationId)

    await expect(page).toHaveURL(/\/app\/recommendations/)
    await expect(page.getByTestId('expert-review-gate')).toHaveCount(0)
    await expect(page.getByTestId('package-plan-basic')).toBeVisible({ timeout: 15_000 })
    await expect(page.getByTestId('package-plan-basic')).toContainText('基礎保養')
  })
})
