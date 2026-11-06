import type { Page } from '@playwright/test'
import { expect, test } from '@nuxt/test-utils/playwright'
import { mockCandorAuth } from './mock-candor-auth'

/** Default candor mock seeds a reviewed expert case; clear so /chat CTAs can paint. */
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

async function finishGoalSelect(page: Page) {
  const entryB = page.getByTestId('chat-quiz-option-b')
  const entryBLegacy = page.getByTestId('chat-quiz-option-B')
  if (await entryB.isVisible().catch(() => false)) {
    await entryB.click()
  } else if (await entryBLegacy.isVisible().catch(() => false)) {
    await entryBLegacy.click()
  }
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

async function mockExpertBookingApis(page: Page, opts: {
  createPaid?: boolean
  captureCreateBody?: { current: unknown }
} = {}) {
  await page.route('**/api/v1/expert-booking-product', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        status: 'success',
        data: {
          code: 'personal',
          name_zh: '預約專家',
          name_en: 'Book an expert',
          description: null,
          price: 6000
        }
      })
    })
  })

  await page.route('**/api/v1/expert-booking-attachments', async (route) => {
    if (route.request().method() !== 'POST') {
      await route.fallback()
      return
    }
    await route.fulfill({
      status: 201,
      contentType: 'application/json',
      body: JSON.stringify({
        status: 'success',
        data: {
          key: 'expert-booking/mock-att-1',
          filename: 'lab.pdf',
          content_type: 'application/pdf',
          size_bytes: 1024
        }
      })
    })
  })

  await page.route('**/api/v1/orders', async (route) => {
    if (route.request().method() !== 'POST') {
      await route.fallback()
      return
    }
    let isExpertBooking = false
    try {
      const raw = route.request().postDataJSON() as {
        lines?: Array<{ kind?: string }>
        expert_booking?: unknown
      } | null
      if (opts.captureCreateBody) {
        opts.captureCreateBody.current = raw
      }
      if (raw?.expert_booking
        || raw?.lines?.some(line => line?.kind === 'expert_booking')) {
        isExpertBooking = true
      }
    } catch {
      // not JSON — treat as non-booking
    }
    if (!isExpertBooking) {
      await route.fallback()
      return
    }
    const paid = Boolean(opts.createPaid)
    await route.fulfill({
      status: 201,
      contentType: 'application/json',
      body: JSON.stringify({
        status: 'success',
        data: {
          id: 'order-eb-001',
          order_no: 'ORD-261106-000021',
          status: paid ? 'paid' : 'pending_payment',
          payment_status: paid ? 'paid' : 'unpaid',
          amount_total: 6000,
          payment: {
            id: 'pay-eb-001',
            method: 'card',
            status: paid ? 'paid' : 'pending',
            amount: 6000,
            redirect_url: null
          }
        }
      })
    })
  })

  await page.route('**/api/v1/order/order-eb-001', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        status: 'success',
        data: {
          id: 'order-eb-001',
          order_no: 'ORD-261106-000021',
          status: 'paid',
          payment_status: 'paid',
          amount_total: 6000,
          lines: [{ kind: 'expert_booking', expert_booking_code: 'personal' }],
          expert_booking: {
            id: 'eb-001',
            status: 'awaiting_schedule',
            contact_name: '王小明',
            contact_phone: '0912345678',
            contact_email: 'guest@example.com',
            contact_line: 'wang.line',
            preferred_slots: ['11/12（四） 14:00–16:00'],
            requirement_note: '想討論減重與作息',
            attachments: [{
              key: 'expert-booking/mock-att-1',
              filename: 'lab.pdf',
              content_type: 'application/pdf',
              size_bytes: 1024
            }],
            confirmed_starts_at: null,
            confirmed_ends_at: null,
            product_picks: []
          },
          recipient: {
            name: '王小明',
            phone: '0912345678',
            address: null,
            email: 'guest@example.com'
          },
          invoice_type: 'member',
          created_at: '2026-11-06T10:00:00+08:00',
          payments: [{
            id: 'pay-eb-001',
            method: 'card',
            status: 'paid',
            amount: 6000
          }]
        }
      })
    })
  })
}

test.describe('預約專家 F-01～F-08', () => {
  test('F-01：對話結尾 offer_expert_booking CTA → /expert-booking', async ({ page, goto }) => {
    test.setTimeout(90_000)
    await mockCandorAuth(page, {
      asMember: true,
      replyActions: 'offer_expert_booking'
    })
    await seedNoExpertCase(page)
    await page.setViewportSize({ width: 1280, height: 800 })
    await goto('/chat', { waitUntil: 'hydration' })
    await page.evaluate(() => localStorage.removeItem('candor.unpaid.journey'))

    await finishGoalSelect(page)
    await sendChatLine(page, '我想預約專家')

    const last = page.getByTestId('chat-last-reply')
    const cta = last.getByTestId('chat-expert-booking')
    await expect(cta).toBeVisible({ timeout: 15_000 })
    await expect(cta).toHaveText('預約專家諮詢')
    await expect(last.getByTestId('chat-view-recommend')).toHaveCount(0)

    await cta.click()
    await expect(page).toHaveURL(/\/expert-booking/)
    await expect(page.getByTestId('expert-booking-page')).toBeVisible()
    await expect(page.getByTestId('expert-booking-form-shell')).toBeVisible()
  })

  test('F-02：未登入會員進 /expert-booking → 登入門檻', async ({ page, goto }) => {
    test.setTimeout(60_000)
    await mockCandorAuth(page, { asMember: false })
    await page.setViewportSize({ width: 390, height: 844 })
    await goto('/expert-booking', { waitUntil: 'hydration' })

    await expect(page.getByTestId('expert-booking-auth-gate')).toBeVisible({ timeout: 15_000 })
    const login = page.getByTestId('expert-booking-go-login')
    await expect(login).toBeVisible()
    await expect(login).toHaveAttribute('href', /\/login\?.*redirect=.*expert-booking/)
  })

  test('F-03／F-04／F-05：表單（含 LINE／附件）→ 確認 → 付款成功 → 訂單區塊', async ({ page, goto }) => {
    test.setTimeout(120_000)
    await mockCandorAuth(page, { asMember: true })
    const captureCreateBody: { current: unknown } = { current: null }
    await mockExpertBookingApis(page, {
      createPaid: true,
      captureCreateBody
    })
    await page.setViewportSize({ width: 390, height: 844 })
    await goto('/expert-booking', { waitUntil: 'hydration' })

    await expect(page.getByTestId('expert-booking-form')).toBeVisible({ timeout: 15_000 })
    await expect(page.getByTestId('expert-booking-email')).toHaveValue(/@/)
    await expect(page.getByTestId('expert-booking-product-card')).toContainText('預約專家')

    await page.getByTestId('expert-booking-name').fill('王小明')
    await page.getByTestId('expert-booking-phone').fill('0912345678')
    await page.getByTestId('expert-booking-line').fill('wang.line')
    const slot = page.getByTestId('expert-booking-slot-0')
    await slot.locator('input[type="date"]').fill('2026-11-12')
    await slot.locator('input[type="time"]').nth(0).fill('14:00')
    await slot.locator('input[type="time"]').nth(1).fill('16:00')
    await page.getByTestId('expert-booking-requirements').fill('想討論減重與作息')

    await page.getByTestId('expert-booking-attachment').locator('input[type="file"]').setInputFiles({
      name: 'lab.pdf',
      mimeType: 'application/pdf',
      buffer: Buffer.from('%PDF-1.4 mock')
    })
    await expect(page.getByTestId('expert-booking-attachment-list')).toContainText('lab.pdf', {
      timeout: 10_000
    })

    await page.getByTestId('expert-booking-next').click()

    await expect(page).toHaveURL(/\/expert-booking\/confirm/)
    await expect(page.getByTestId('expert-booking-confirm-summary')).toBeVisible()
    await expect(page.getByTestId('expert-booking-confirm-line')).toContainText('wang.line')
    await expect(page.getByTestId('expert-booking-confirm-attachments')).toContainText('lab.pdf')
    await page.getByTestId('expert-booking-submit-pay').click()

    await expect(page).toHaveURL(/\/app\/orders\/paid/, { timeout: 15_000 })

    const body = captureCreateBody.current as {
      lines?: Array<{ kind?: string, expert_booking_code?: string }>
      expert_booking?: {
        contact_name?: string
        contact_line?: string | null
        preferred_slots?: string[]
        requirement_note?: string | null
        attachments?: Array<{ key?: string }>
      }
      recipient?: { address?: string | null }
      invoice_carrier?: string
    } | null
    expect(body?.lines?.[0]?.kind).toBe('expert_booking')
    expect(body?.lines?.[0]?.expert_booking_code).toBe('personal')
    expect(body?.expert_booking?.contact_name).toBe('王小明')
    expect(body?.expert_booking?.contact_line).toBe('wang.line')
    expect(body?.expert_booking?.requirement_note).toBe('想討論減重與作息')
    expect(body?.expert_booking?.preferred_slots?.[0]).toEqual(expect.any(String))
    expect(body?.expert_booking?.attachments?.[0]?.key).toBe('expert-booking/mock-att-1')
    expect(body?.recipient?.address).toBeNull()
    expect(body?.invoice_carrier).toMatch(/@/)

    await expect(page.getByTestId('expert-booking-paid-page')).toBeVisible()
    await expect(page.getByTestId('expert-booking-paid-page')).toContainText('付款成功')
    await page.getByTestId('expert-booking-view-order').click()

    await expect(page).toHaveURL(/\/app\/orders\/order-eb-001/)
    await expect(page.getByTestId('expert-booking-order-section')).toBeVisible({ timeout: 15_000 })
    await expect(page.getByTestId('expert-booking-status-pill')).toContainText('待安排')
    await expect(page.getByTestId('expert-booking-confirmed-at')).toContainText('尚未確認')
    await expect(page.getByTestId('expert-booking-recommendations-empty')).toBeVisible()
  })

  test('F-08：訂單詳情顯示已安排＋選品與理由', async ({ page, goto }) => {
    test.setTimeout(60_000)
    await mockCandorAuth(page, { asMember: true })
    await page.route('**/api/v1/order/order-eb-sched', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          status: 'success',
          data: {
            id: 'order-eb-sched',
            order_no: 'ORD-261106-000021',
            status: 'paid',
            payment_status: 'paid',
            amount_total: 6000,
            lines: [{ kind: 'expert_booking', expert_booking_code: 'personal' }],
            expert_booking: {
              id: 'eb-sched',
              status: 'scheduled',
              preferred_slots: ['11/12（四） 14:00–16:00'],
              requirement_note: '減重',
              attachments: [],
              confirmed_starts_at: '2026-11-12T15:00:00+08:00',
              confirmed_ends_at: '2026-11-12T16:00:00+08:00',
              product_picks: [
                {
                  id: 'pick-mg',
                  sellable_item_id: 'si-mg',
                  sellable_item_name: 'Magnesium 6 in 1（6合1鎂）',
                  reason: '協助放鬆與睡眠品質',
                  sort_order: 0
                },
                {
                  id: 'pick-b',
                  sellable_item_id: 'si-b',
                  sellable_item_name: 'Active B complex（綜合活性B群）',
                  reason: '壓力與能量代謝支持',
                  sort_order: 1
                }
              ]
            },
            recipient: {
              name: '王小明',
              phone: '0912345678',
              address: null,
              email: 'guest@example.com'
            },
            invoice_type: 'member',
            created_at: '2026-11-06T10:00:00+08:00',
            payments: [{
              id: 'pay-1',
              method: 'card',
              status: 'paid',
              amount: 6000
            }]
          }
        })
      })
    })

    await page.setViewportSize({ width: 390, height: 844 })
    await goto('/app/orders/order-eb-sched', { waitUntil: 'hydration' })

    await expect(page.getByTestId('expert-booking-order-section')).toBeVisible({ timeout: 15_000 })
    await expect(page.getByTestId('expert-booking-status-pill')).toContainText('已安排')
    await expect(page.getByTestId('expert-booking-confirmed-at')).not.toContainText('尚未確認')
    await expect(page.getByTestId('expert-booking-rec-si-mg')).toContainText('Magnesium')
    await expect(page.getByTestId('expert-booking-rec-si-b')).toContainText('Active B')
    await expect(page.getByTestId('expert-booking-reschedule-note')).toBeVisible()
  })
})
