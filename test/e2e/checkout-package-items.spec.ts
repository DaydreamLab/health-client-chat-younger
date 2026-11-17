import type { Page } from '@playwright/test'
import { expect, test } from '@nuxt/test-utils/playwright'
import { mkdirSync } from 'node:fs'
import { e2eArtifactPath } from './helpers/artifacts-dir'
import { mockCandorAuth } from './mock-candor-auth'

async function seedJourneyConversation(page: Page) {
  await page.addInitScript(() => {
    localStorage.setItem('candor.guest.token', 'e2e-member-token')
    localStorage.setItem('candor.unpaid.journey', JSON.stringify({
      conversationId: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
      messages: [],
      reportId: null,
      selectedPackageCode: 'basic'
    }))
  })
}

test.describe('checkout package item list (kind=package)', () => {
  test('lists sellable item names from preview.ai.items', async ({ page, goto }) => {
    await mockCandorAuth(page, { asMember: true, expertReview: 'none' })
    await seedJourneyConversation(page)
    await goto('/app/checkout?kind=package&package_plan_code=basic&composition_hash=sha256:basic', {
      waitUntil: 'hydration'
    })
    const summary = page.getByTestId('checkout-package-summary')
    await expect(summary).toBeVisible({ timeout: 25_000 })
    await expect(summary).toContainText('基礎保養')
    await expect(summary).not.toContainText('共')
    const items = page.getByTestId('checkout-package-items')
    await expect(items).toBeVisible()
    await expect(items).toContainText('維生素 D')
    await expect(items).toContainText('鐵蛋白調理')
    await page.setViewportSize({ width: 390, height: 844 })
    const shotPath = e2eArtifactPath('checkout-package-items-390.png')
    await page.screenshot({ path: shotPath, fullPage: false })
    try {
      mkdirSync('/opt/cursor/artifacts', { recursive: true })
      await page.screenshot({
        path: '/opt/cursor/artifacts/checkout-package-items-390.png',
        fullPage: false
      })
    } catch {
      // Cloud agent artifacts dir is optional outside this environment.
    }
  })

  test('falls back to code when item name is missing', async ({ page, goto }) => {
    await mockCandorAuth(page, { asMember: true, expertReview: 'none' })
    await seedJourneyConversation(page)
    await page.route('**/api/v1/checkout/preview**', async (route) => {
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
            conversation_id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
            mode: 'ai',
            block: null,
            checkout_locked: false,
            checkout_lock_reason: null,
            recipient: null,
            shipping: { fee: 0, free: true },
            invoice: {},
            payment_methods: [{ code: 'card', available: true, status: null }],
            expert_plans: [],
            preselect_expert_plan_code: null,
            ai: {
              package_plan_code: 'basic',
              package_plan_name: '基礎保養',
              name_zh: '基礎保養',
              price: 1980,
              period_days: 30,
              item_count: 2,
              used_amount: 280,
              remaining: 1700,
              composition_hash: 'sha256:basic',
              items: [
                {
                  rank: 1,
                  sellable_item_id: 'dddddddd-dddd-dddd-dddd-dddddddddd01',
                  code: 'vitamin_d',
                  name: null,
                  daily_dose: 1,
                  is_core: true
                },
                {
                  rank: 2,
                  sellable_item_id: 'dddddddd-dddd-dddd-dddd-dddddddddd02',
                  code: 'iron',
                  name: '   ',
                  daily_dose: 1,
                  is_core: false
                }
              ],
              bottle_addons: [],
              addon_subtotal: 0,
              amount_total: 1980
            },
            completion_choice: null,
            existing_order: null
          }
        })
      })
    })
    await goto('/app/checkout?kind=package&package_plan_code=basic&composition_hash=sha256:basic', {
      waitUntil: 'hydration'
    })
    const summary = page.getByTestId('checkout-package-summary')
    await expect(summary).toBeVisible({ timeout: 25_000 })
    await expect(summary).toContainText('基礎保養')
    await expect(summary).not.toContainText('共')
    const items = page.getByTestId('checkout-package-items')
    await expect(items).toBeVisible()
    await expect(items).toContainText('vitamin_d')
    await expect(items).toContainText('iron')
    await expect(items).not.toContainText('維生素 D')
  })
})
