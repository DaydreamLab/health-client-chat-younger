import { expect, test } from '@nuxt/test-utils/playwright'
import { mockCandorAuth } from './mock-candor-auth'

test.describe('bottle addon (整瓶加購)', () => {
  test.beforeEach(async ({ page }) => {
    await mockCandorAuth(page, { member: true })
  })

  test('recommendations shows addons; checkout confirms amounts from preview', async ({
    page,
    goto
  }) => {
    await page.addInitScript(() => {
      localStorage.setItem('candor.guest.token', 'e2e-member-token')
      localStorage.setItem('candor.unpaid.journey', JSON.stringify({
        messages: [],
        hasAnalysis: true,
        selectedPackageCode: 'basic',
        selectedBottleAddonCodes: [],
        conversationId: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
        reportId: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
        reportDockOpen: false,
        reportDockCollapsed: true,
        reportInterpretSent: true,
        selectedPackage: null,
        packageConfirmed: false,
        goalSelectActive: false,
        reportAskActive: false,
        goalOptions: [],
        selectedCodes: [],
        quizActive: false,
        activeQuestion: null,
        postQuizGuided: false,
        profileGaps: [],
        clarifyingGoals: [],
        expertReviewStatus: 'none',
        conversationPath: 'b'
      }))
    })

    await goto('/app/recommendations', { waitUntil: 'hydration' })
    await page.getByTestId('recommendation-path-ai').click()
    await expect(page.getByTestId('bottle-addon-section')).toBeVisible({ timeout: 25000 })
    await expect(page.getByTestId('bottle-addon-omega3')).toBeVisible()
    await page.getByTestId('bottle-addon-check-omega3').check()
    await page.getByTestId('recommendation-go-checkout').click()

    await expect(page).toHaveURL(/\/app\/checkout/)
    await expect(page.getByTestId('checkout-bottle-addons')).toBeVisible({ timeout: 25000 })
    await expect(page.getByTestId('checkout-package-subtotal')).toContainText('1,980')
    await expect(page.getByTestId('checkout-addon-subtotal')).toContainText('890')
    await expect(page.getByTestId('checkout-total')).toContainText('2,870')
    await expect(page.getByTestId('checkout-refund-whole-order-note')).toBeVisible()

    const createBodies: unknown[] = []
    page.on('request', (request) => {
      if (request.method() === 'POST' && request.url().includes('/api/v1/orders')) {
        createBodies.push(request.postDataJSON())
      }
    })

    await page.getByTestId('checkout-submit').click()
    await expect.poll(() => createBodies.length, { timeout: 15000 }).toBeGreaterThan(0)
    const body = createBodies[0] as {
      lines: Array<{ kind: string, sellable_item_code?: string, qty?: number }>
    }
    expect(body.lines.some(line => line.kind === 'package')).toBe(true)
    expect(body.lines).toEqual(expect.arrayContaining([
      expect.objectContaining({
        kind: 'bottle_addon',
        sellable_item_code: 'omega3',
        qty: 1
      })
    ]))
  })

  test('hides addon section when recommendations returns empty addons', async ({
    page,
    goto
  }) => {
    await page.route('**/api/v1/recommendations', async (route) => {
      if (route.request().method() !== 'POST') {
        await route.fallback()
        return
      }
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          status: 'success',
          data: {
            run_id: 'cccccccc-cccc-cccc-cccc-cccccccccccc',
            report_id: null,
            weight_set: { id: 'ws-e2e', version: '0.1.0' },
            generated_at: '2026-01-01T00:00:00Z',
            copy_mode: 'template',
            summary: {
              top_domains: [],
              data_gaps: [],
              profile_gaps: [],
              strategy_code: 'focus_abnormal',
              message: null
            },
            items: [],
            packages: [{
              package_plan_code: 'basic',
              package_plan_name: '基礎保養',
              price: 1280,
              period_days: 30,
              items: [{
                rank: 1,
                sellable_item_id: 'dddddddd-dddd-dddd-dddd-dddddddddd01',
                code: 'vitamin_d',
                name: '維生素 D',
                unit_price: 9,
                daily_dose: 1,
                monthly_cost: 280,
                is_core: true
              }],
              used_amount: 280,
              remaining: 1000,
              composition_hash: 'sha256:basic'
            }],
            addons: [],
            excluded: []
          }
        })
      })
    })

    await page.addInitScript(() => {
      localStorage.setItem('candor.guest.token', 'e2e-member-token')
      localStorage.setItem('candor.unpaid.journey', JSON.stringify({
        messages: [],
        hasAnalysis: false,
        selectedPackageCode: null,
        selectedBottleAddonCodes: [],
        conversationId: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
        reportId: null,
        reportDockOpen: false,
        reportDockCollapsed: true,
        reportInterpretSent: false,
        selectedPackage: null,
        packageConfirmed: false,
        goalSelectActive: false,
        reportAskActive: false,
        goalOptions: [],
        selectedCodes: [],
        quizActive: false,
        activeQuestion: null,
        postQuizGuided: false,
        profileGaps: [],
        clarifyingGoals: [],
        expertReviewStatus: 'none',
        conversationPath: 'b'
      }))
    })

    await goto('/app/recommendations', { waitUntil: 'hydration' })
    await page.getByTestId('recommendation-path-ai').click()
    await expect(page.getByTestId('recommendation-go-checkout')).toBeVisible({ timeout: 25000 })
    await expect(page.getByTestId('bottle-addon-section')).toHaveCount(0)
  })
})
