/**
 * In-page AuthLoginForm stay must reload member-only data after login.
 * Checkout: GET /checkout/preview; expert-booking confirm: GET /expert-booking-product.
 * Mock API only. Run: pnpm generate && pnpm test:e2e:spa
 */
import { spawn } from 'node:child_process'
import type { ChildProcess } from 'node:child_process'
import { createServer } from 'node:http'
import type { Server } from 'node:http'
import type { AddressInfo } from 'node:net'
import { mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'

const TOKEN_KEY = 'candor.guest.token'
const PRIVACY_KEY = 'candor.privacy.consent.version'
const JOURNEY_KEY = 'candor.unpaid.journey'
const BOOKING_DRAFT_KEY = 'candor.expert-booking.draft'
const ORIGIN = 'http://127.0.0.1:4179'
const STATIC_PORT = '4179'
const SESSION_DELAY_MS = 400
const CONVERSATION_ID = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'

const MEMBER = {
  id: 'm1',
  role: 'member' as const,
  email: 'guest@example.com',
  display_name: 'Guest',
  created_at: '2026-01-01T00:00:00Z',
  default_recipient: null
}

const GUEST = {
  id: 'g1',
  role: 'guest' as const,
  email: null,
  display_name: null
}

const PRODUCT = {
  code: 'personal',
  name_zh: '專人健康諮詢',
  name_en: 'Personal health consult',
  description: '一對一諮詢',
  description_en: 'One-to-one',
  price: 6500
}

function ok<T>(data: T) {
  return { status: 'success' as const, data }
}

function fail(message: string, code = 'unauthorized') {
  return {
    status: 'failed' as const,
    error_message: message,
    error_code: code,
    error_data: null
  }
}

function bearerToken(authHeader: string | undefined): string | null {
  if (!authHeader?.startsWith('Bearer ')) {
    return null
  }
  return authHeader.slice('Bearer '.length).trim() || null
}

function listenApi(): Promise<{
  server: Server
  port: number
  stats: { preview: number, product: number }
}> {
  const stats = { preview: 0, product: 0 }
  const server = createServer((req, res) => {
    const url = new URL(req.url || '/', 'http://127.0.0.1')
    res.setHeader('access-control-allow-origin', '*')
    res.setHeader('access-control-allow-headers', '*')
    res.setHeader('access-control-allow-methods', '*')
    if (req.method === 'OPTIONS') {
      res.writeHead(204)
      res.end()
      return
    }

    const json = (body: unknown, status = 200) => {
      res.writeHead(status, { 'content-type': 'application/json' })
      res.end(JSON.stringify(body))
    }

    const token = bearerToken(req.headers.authorization)
    const isMember = Boolean(
      token && (token.includes('member') || token === 'e2e-member-token')
    )
    const later = (fn: () => void) => {
      setTimeout(fn, SESSION_DELAY_MS)
    }

    if (url.pathname.endsWith('/auth/guest')) {
      json(ok({
        token: 'e2e-guest-token',
        expires_in: 3600,
        user: GUEST
      }), 201)
      return
    }

    if (url.pathname.endsWith('/auth/login') || url.pathname.endsWith('/auth/register')) {
      json(ok({
        token: 'e2e-member-token',
        expires_in: 3600,
        user: MEMBER
      }), url.pathname.endsWith('/auth/register') ? 201 : 200)
      return
    }

    if (url.pathname.endsWith('/auth/refresh')) {
      later(() => {
        json(ok({
          token: isMember ? 'e2e-member-token' : 'e2e-guest-token',
          expires_in: 3600,
          user: isMember ? MEMBER : GUEST
        }))
      })
      return
    }

    if (url.pathname.endsWith('/users/me')) {
      // Align with candor-core GET /users/me:
      // - no/invalid Bearer → 401 (AuthMiddleware.php:26-32)
      // - guest JWT → 200 + role=guest (UserAuthService::me L211-221, userMePayload L396;
      //   docs/spec/24-identity-and-auth.md L178-180)
      later(() => {
        if (!token) {
          json(fail('unauthorized'), 401)
          return
        }
        if (isMember) {
          json(ok(MEMBER))
          return
        }
        json(ok({
          ...GUEST,
          created_at: '2026-01-01T00:00:00Z',
          default_recipient: null
        }))
      })
      return
    }

    if (url.pathname.includes('/checkout/preview')) {
      if (!isMember) {
        json(fail('unauthorized'), 401)
        return
      }
      stats.preview += 1
      json(ok({
        conversation_id: CONVERSATION_ID,
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
        payment_methods: [{ code: 'card', available: true, status: null }],
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
            daily_dose: 1,
            is_core: true
          }],
          bottle_addons: [],
          addon_subtotal: 0,
          amount_total: 1980
        },
        completion_choice: null,
        existing_order: null
      }))
      return
    }

    if (url.pathname.includes('/expert-booking-product')) {
      if (!isMember) {
        json(fail('unauthorized'), 401)
        return
      }
      stats.product += 1
      json(ok(PRODUCT))
      return
    }

    if (url.pathname.includes('/legal/privacy-policy')) {
      json(ok({ version: '2026-10-24', content_md: 'privacy' }))
      return
    }

    if (url.pathname.includes('/client-config')) {
      json(ok({}))
      return
    }

    if (url.pathname.includes('/orders') || url.pathname.includes('/order')) {
      json(ok({ orders: [], items: [], total: 0 }))
      return
    }

    json(ok({}))
  })

  return new Promise((resolve) => {
    server.listen(0, '127.0.0.1', () => {
      const addr = server.address() as AddressInfo
      resolve({ server, port: addr.port, stats })
    })
  })
}

async function startStatic(): Promise<ChildProcess> {
  const script = fileURLToPath(
    new URL('../../scripts/cf-static-server.mjs', import.meta.url)
  )
  const child = spawn(process.execPath, [script], {
    env: { ...process.env, PORT: STATIC_PORT },
    stdio: ['ignore', 'pipe', 'pipe']
  })
  await new Promise<void>((resolve) => {
    const timer = setTimeout(() => resolve(), 1500)
    child.stdout?.on('data', (buf: Buffer) => {
      if (String(buf).includes(STATIC_PORT) || String(buf).includes('cf-static-server')) {
        clearTimeout(timer)
        resolve()
      }
    })
  })
  return child
}

async function rewriteApi(page: Page, apiPort: number) {
  await page.route('**/api/v1/**', async (route) => {
    const url = new URL(route.request().url())
    url.protocol = 'http:'
    url.hostname = '127.0.0.1'
    url.port = String(apiPort)
    await route.continue({ url: url.toString() })
  })
}

async function seedGuestWithJourney(page: Page) {
  await page.addInitScript(({ tokenKey, privacyKey, journeyKey, conversationId }) => {
    localStorage.setItem(tokenKey, 'e2e-guest-token')
    localStorage.setItem(privacyKey, '2026-10-24')
    localStorage.setItem(journeyKey, JSON.stringify({
      messages: [],
      hasAnalysis: false,
      selectedPackageCode: 'basic',
      selectedBottleAddonCodes: [],
      bottleAddonCatalog: [],
      conversationId,
      reportId: null,
      reportDockOpen: false,
      reportDockCollapsed: false,
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
      conversationPath: null
    }))
  }, {
    tokenKey: TOKEN_KEY,
    privacyKey: PRIVACY_KEY,
    journeyKey: JOURNEY_KEY,
    conversationId: CONVERSATION_ID
  })
}

async function seedGuestWithBookingDraft(page: Page) {
  await page.addInitScript(({ tokenKey, privacyKey, draftKey }) => {
    localStorage.setItem(tokenKey, 'e2e-guest-token')
    localStorage.setItem(privacyKey, '2026-10-24')
    sessionStorage.setItem(draftKey, JSON.stringify({
      contactName: '測試客人',
      phone: '0912345678',
      email: 'guest@example.com',
      lineId: '',
      slots: [{ date: '2026-12-01', startTime: '09:00', endTime: '10:00' }],
      requirements: '想了解營養',
      attachments: []
    }))
  }, {
    tokenKey: TOKEN_KEY,
    privacyKey: PRIVACY_KEY,
    draftKey: BOOKING_DRAFT_KEY
  })
}

async function seedMember(page: Page) {
  await page.addInitScript(({ tokenKey, privacyKey, journeyKey, conversationId }) => {
    localStorage.setItem(tokenKey, 'e2e-member-token')
    localStorage.setItem(privacyKey, '2026-10-24')
    localStorage.setItem(journeyKey, JSON.stringify({
      messages: [],
      conversationId,
      hasAnalysis: false,
      selectedPackageCode: 'basic',
      selectedBottleAddonCodes: [],
      bottleAddonCatalog: [],
      reportId: null,
      reportDockOpen: false,
      reportDockCollapsed: false,
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
      conversationPath: null
    }))
  }, {
    tokenKey: TOKEN_KEY,
    privacyKey: PRIVACY_KEY,
    journeyKey: JOURNEY_KEY,
    conversationId: CONVERSATION_ID
  })
}

test.describe.serial('spa checkout / confirm login stay reload', () => {
  let api: Awaited<ReturnType<typeof listenApi>>
  let staticProc: ChildProcess

  test.beforeAll(async () => {
    mkdirSync(join('test-results', 'artifacts'), { recursive: true })
    api = await listenApi()
    staticProc = await startStatic()
  })

  test.afterAll(async () => {
    staticProc.kill('SIGTERM')
    await new Promise<void>(resolve => api.server.close(() => resolve()))
  })

  test('guest in-page login on checkout reloads preview once and shows package card', async ({ page }) => {
    api.stats.preview = 0
    await rewriteApi(page, api.port)
    await seedGuestWithJourney(page)
    await page.goto(
      `${ORIGIN}/app/checkout?kind=package&package_plan_code=basic`,
      { waitUntil: 'networkidle' }
    )
    await expect(page.getByTestId('login-form')).toBeVisible({ timeout: 20_000 })
    expect(api.stats.preview).toBe(0)

    await page.locator('input[type="email"]').fill('guest@example.com')
    await page.locator('input[type="password"]').fill('password12345')
    await page.getByTestId('login-form').locator('button[type="submit"]').click()

    await expect(page.getByTestId('checkout-package-summary')).toBeVisible({ timeout: 20_000 })
    await expect(page.getByTestId('checkout-card')).toBeVisible()
    await expect(page).toHaveURL(/\/app\/checkout/)
    expect(api.stats.preview).toBe(1)
  })

  test('member direct-open checkout loads preview only once', async ({ page }) => {
    api.stats.preview = 0
    await rewriteApi(page, api.port)
    await seedMember(page)
    await page.goto(
      `${ORIGIN}/app/checkout?kind=package&package_plan_code=basic`,
      { waitUntil: 'networkidle' }
    )
    await expect(page.getByTestId('checkout-package-summary')).toBeVisible({ timeout: 20_000 })
    await expect(page.getByTestId('checkout-card')).toBeVisible()
    expect(api.stats.preview).toBe(1)
  })

  test('guest in-page login on expert-booking confirm refreshes product', async ({ page }) => {
    api.stats.product = 0
    await rewriteApi(page, api.port)
    await seedGuestWithBookingDraft(page)
    await page.goto(`${ORIGIN}/expert-booking/confirm`, { waitUntil: 'networkidle' })
    await expect(page.getByTestId('login-form')).toBeVisible({ timeout: 20_000 })
    expect(api.stats.product).toBe(0)

    await page.locator('input[type="email"]').fill('guest@example.com')
    await page.locator('input[type="password"]').fill('password12345')
    await page.getByTestId('login-form').locator('button[type="submit"]').click()

    await expect(page.getByTestId('expert-booking-confirm-summary')).toBeVisible({
      timeout: 20_000
    })
    await expect(page.getByTestId('expert-booking-confirm-item')).toContainText(PRODUCT.name_zh)
    await expect(page.getByTestId('expert-booking-confirm-amount')).toContainText('6,500')
    await expect(page).toHaveURL(/\/expert-booking\/confirm/)
    expect(api.stats.product).toBeGreaterThanOrEqual(1)
  })
})
