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

  test('AI 方案顯示時點專家預約需確認；取消留在 AI，確認才去專家結帳且保留加購', async ({
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
    await page.getByTestId('bottle-addon-check-omega3').check()

    page.once('dialog', async (dialog) => {
      expect(dialog.type()).toBe('confirm')
      await dialog.dismiss()
    })
    await page.getByTestId('recommendation-path-expert').click()
    await expect(page).toHaveURL(/\/app\/recommendations/)
    await expect(page.getByTestId('bottle-addon-check-omega3')).toBeChecked()

    page.once('dialog', async (dialog) => {
      await dialog.accept()
    })
    await page.getByTestId('recommendation-path-expert').click()
    await expect(page).toHaveURL(/\/app\/checkout/)
    await expect(page).toHaveURL(/kind=expert_plan/)

    const journeyRaw = await page.evaluate(() => localStorage.getItem('candor.unpaid.journey'))
    expect(journeyRaw).toBeTruthy()
    const journey = JSON.parse(journeyRaw!) as { selectedBottleAddonCodes: string[] }
    expect(journey.selectedBottleAddonCodes).toContain('omega3')
  })

  test('checkout URL without kind but with package_plan_code is AI package', async ({
    page,
    goto
  }) => {
    await page.addInitScript(() => {
      localStorage.setItem('candor.guest.token', 'e2e-member-token')
      localStorage.setItem('candor.unpaid.journey', JSON.stringify({
        messages: [],
        hasAnalysis: true,
        selectedPackageCode: 'basic',
        selectedBottleAddonCodes: ['omega3'],
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

    await goto(
      '/app/checkout?package_plan_code=basic&composition_hash=sha256:basic&addon_codes=omega3',
      { waitUntil: 'hydration' }
    )
    await expect(page.getByTestId('checkout-bottle-addons')).toBeVisible({ timeout: 25000 })
    await expect(page.getByTestId('checkout-card')).toBeVisible()
    await expect(page.getByTestId('expert-plan-checkout-card')).toHaveCount(0)
  })

  test('cancelling addon syncs addon_codes in URL and shows bottle_price', async ({
    page,
    goto
  }) => {
    await page.route('**/api/v1/checkout/preview**', async (route) => {
      if (route.request().method() !== 'GET') {
        await route.fallback()
        return
      }
      const url = new URL(route.request().url())
      const addonCodes = url.searchParams.getAll('addon_codes')
        .flatMap(value => value.split(','))
        .map(value => value.trim())
        .filter(Boolean)
      const includeOmega = addonCodes.includes('omega3')
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          status: 'success',
          data: {
            conversation_id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
            mode: 'ai',
            block: null,
            checkout_locked: false,
            checkout_lock_reason: null,
            recipient: {
              name: '林晏婷',
              phone: '0912345678',
              address: '台北市大安區復興南路一段 100 號',
              address_city: '台北市',
              address_district: '大安區',
              address_detail: '復興南路一段 100 號',
              email: 'guest@example.com'
            },
            shipping: { fee: 0, free: true },
            invoice: {},
            payment_methods: [
              { code: 'card', available: true, status: null }
            ],
            expert_plans: [],
            preselect_expert_plan_code: null,
            ai: {
              package_plan_code: 'basic',
              package_plan_name: '基礎保養',
              name_zh: '基礎保養',
              price: 1980,
              period_days: 30,
              item_count: 1,
              used_amount: 280,
              remaining: 1700,
              composition_hash: 'sha256:basic',
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
              bottle_addons: includeOmega
                ? [{
                    sellable_item_code: 'omega3',
                    sellable_item_name: 'Omega-3',
                    qty: 1,
                    bottle_price: 890,
                    amount: 999
                  }]
                : [],
              addon_subtotal: includeOmega ? 999 : 0,
              amount_total: includeOmega ? 2979 : 1980
            },
            completion_choice: null,
            existing_order: null
          }
        })
      })
    })

    await page.addInitScript(() => {
      localStorage.setItem('candor.guest.token', 'e2e-member-token')
      // Do not clobber journey on reload — cancel state must survive.
      if (!localStorage.getItem('candor.unpaid.journey')) {
        localStorage.setItem('candor.unpaid.journey', JSON.stringify({
          messages: [],
          hasAnalysis: true,
          selectedPackageCode: 'basic',
          selectedBottleAddonCodes: ['omega3'],
          bottleAddonCatalog: [{
            sellable_item_code: 'omega3',
            sellable_item_name: 'Omega-3',
            bottle_price: 890,
            qty: 1
          }],
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
      }
    })

    await goto(
      '/app/checkout?kind=package&package_plan_code=basic&composition_hash=sha256:basic&addon_codes=omega3',
      { waitUntil: 'hydration' }
    )
    await expect(page.getByTestId('checkout-bottle-addons')).toBeVisible({ timeout: 25000 })
    await expect(page.getByTestId('checkout-bottle-addon-price-omega3')).toContainText('999')

    await page.getByTestId('checkout-bottle-addon-check-omega3').uncheck()
    await expect(page).not.toHaveURL(/addon_codes=/)
    await expect(page.getByTestId('checkout-bottle-addon-price-omega3')).toContainText('890')
    await expect(page.getByTestId('checkout-addon-subtotal')).toHaveCount(0)

    const journeyRaw = await page.evaluate(() => localStorage.getItem('candor.unpaid.journey'))
    const journey = JSON.parse(journeyRaw!) as {
      selectedBottleAddonCodes: string[]
      bottleAddonCatalog: Array<{ sellable_item_code: string }>
    }
    expect(journey.selectedBottleAddonCodes).not.toContain('omega3')
    expect(journey.bottleAddonCatalog.map(row => row.sellable_item_code)).toContain('omega3')

    // Reload without addon_codes — cancelled row must remain and be restorable.
    await page.reload({ waitUntil: 'domcontentloaded' })
    await expect(page.getByTestId('checkout-bottle-addon-omega3')).toBeVisible({ timeout: 25000 })
    await expect(page.getByTestId('checkout-bottle-addon-check-omega3')).not.toBeChecked()
    await expect(page.getByTestId('checkout-bottle-addon-price-omega3')).toContainText('890')

    await page.getByTestId('checkout-bottle-addon-check-omega3').check()
    await expect(page).toHaveURL(/addon_codes=omega3/)
    await expect(page.getByTestId('checkout-addon-subtotal')).toBeVisible({ timeout: 25000 })
  })

  test('re-recommend keeps checkbox when same addon is still recommended', async ({
    page,
    goto
  }) => {
    await page.addInitScript(() => {
      localStorage.setItem('candor.guest.token', 'e2e-member-token')
      localStorage.setItem('candor.unpaid.journey', JSON.stringify({
        messages: [],
        hasAnalysis: false,
        selectedPackageCode: 'basic',
        selectedBottleAddonCodes: ['omega3'],
        bottleAddonCatalog: [],
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
    await expect(page.getByTestId('bottle-addon-check-omega3')).toBeVisible({ timeout: 25000 })
    await expect(page.getByTestId('bottle-addon-check-omega3')).toBeChecked()
    await expect(page.getByTestId('recommendation-addons-dropped-hint')).toHaveCount(0)

    // Remount + re-fetch recommendations (still includes omega3) — selection must stay.
    await goto('/app/recommendations', { waitUntil: 'hydration' })
    await page.getByTestId('recommendation-path-ai').click()
    await expect(page.getByTestId('bottle-addon-check-omega3')).toBeChecked({ timeout: 25000 })
    await expect(page.getByTestId('recommendation-addons-dropped-hint')).toHaveCount(0)
  })

  test('re-recommend shows hint when selected addons disappear', async ({
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
        selectedPackageCode: 'basic',
        selectedBottleAddonCodes: ['omega3'],
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
    await expect(page.getByTestId('recommendation-addons-dropped-hint')).toBeVisible({
      timeout: 25000
    })
    await expect(page.getByTestId('recommendation-addons-dropped-hint')).toContainText('omega3')
    await expect(page.getByTestId('bottle-addon-section')).toHaveCount(0)
  })
})
