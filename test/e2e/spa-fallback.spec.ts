/**
 * Static hosting smoke tests against `pnpm generate` output.
 * Simulates CloudFront: extensionless → index.html / dynamic → `_` shell,
 * miss → `/200.html`. Mock API only — no real model or prod backend.
 *
 * Run: pnpm generate && pnpm test:e2e:spa
 */
import { spawn } from 'node:child_process'
import type { ChildProcess } from 'node:child_process'
import { createServer } from 'node:http'
import type { Server } from 'node:http'
import type { AddressInfo } from 'node:net'
import { fileURLToPath } from 'node:url'
import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'

const TOKEN_KEY = 'candor.guest.token'
const PRIVACY_KEY = 'candor.privacy.consent.version'
const ORIGIN = 'http://127.0.0.1:4173'

/** Dynamic routes that use CloudFront → `/…/_/index.html` shells. */
const DYNAMIC_PATHS = [
  {
    name: 'orders',
    path: '/app/orders/ord-spa-1',
    guestTestId: 'order-detail-auth-gate',
    memberTestId: 'order-detail'
  },
  {
    name: 'expert-cases',
    path: '/app/expert-cases/ec-spa-1',
    // Guest/member both hydrate the case shell; mock returns awaiting_review.
    guestTestId: 'expert-case-awaiting',
    memberTestId: 'expert-case-awaiting'
  },
  {
    name: 'wearables',
    path: '/app/wearables/apple-watch',
    guestTestId: 'wearables-detail',
    memberTestId: 'wearables-detail'
  }
] as const

function ok<T>(data: T) {
  return { status: 'success' as const, data }
}

async function listenApi(): Promise<{ server: Server, port: number }> {
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

    const auth = req.headers.authorization || ''
    const isMember = auth.includes('e2e-member-token')
      || auth.includes('member-t')

    if (url.pathname.endsWith('/auth/guest')) {
      json(ok({
        token: 'e2e-guest-token',
        expires_in: 3600,
        user: { id: 'g1', role: 'guest', email: null, display_name: null }
      }))
      return
    }

    if (url.pathname.endsWith('/auth/refresh')) {
      if (isMember) {
        json(ok({
          token: 'e2e-member-token',
          expires_in: 3600,
          user: {
            id: 'm1',
            role: 'member',
            email: 'guest@example.com',
            display_name: 'Guest'
          }
        }))
        return
      }
      json(ok({
        token: 'e2e-guest-token',
        expires_in: 3600,
        user: { id: 'g1', role: 'guest', email: null, display_name: null }
      }))
      return
    }

    if (url.pathname.endsWith('/users/me')) {
      if (isMember) {
        json(ok({
          id: 'm1',
          role: 'member',
          email: 'guest@example.com',
          display_name: 'Guest'
        }))
        return
      }
      if (auth.includes('e2e-guest-token') || auth.includes('guest')) {
        json(ok({
          id: 'g1',
          role: 'guest',
          email: null,
          display_name: null
        }))
        return
      }
      json({
        status: 'error',
        error: { code: 'unauthorized', message: 'unauthorized' }
      }, 401)
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

    if (url.pathname.includes('/package-plans')) {
      json(ok({ items: [] }))
      return
    }

    if (url.pathname.includes('/health-profile')
      || url.pathname.includes('/users/me/health')
      || url.pathname.includes('/profile')) {
      json(ok({
        sex: null,
        age: null,
        height_cm: null,
        weight_kg: null,
        goals: []
      }))
      return
    }

    if (url.pathname.includes('/health-reports')
      || url.pathname.includes('/reports')) {
      json(ok({ items: [], total: 0 }))
      return
    }

    if (url.pathname.includes('/notifications')) {
      json(ok({ items: [], unread_count: 0, total: 0 }))
      return
    }

    // Core uses singular `/order/{id}` (see useCandorApi.getOrder).
    if (/\/order\/[^/]+$/.test(url.pathname)) {
      json(ok({
        id: 'ord-spa-1',
        order_no: 'O-SPA-1',
        status: 'paid',
        payment_status: 'paid',
        amount_total: 1990,
        package_amount: 1990,
        addon_amount: 0,
        package_plan_name: '基礎保養',
        package: {
          id: 'pkg-1',
          package_plan_code: 'basic',
          package_plan_name: '基礎保養',
          package_plan_price: 1990,
          period_days: 30,
          composition_hash: 'sha256:basic',
          used_amount: 1990,
          remaining: 0,
          components: []
        },
        lines: [{ kind: 'package', package_plan_code: 'basic' }],
        bottle_addons: [],
        recipient: {
          name: 'Guest',
          phone: '0912345678',
          address: '台北市',
          email: 'guest@example.com'
        },
        invoice_type: 'member',
        created_at: '2026-01-01T00:00:00Z'
      }))
      return
    }

    if (url.pathname.includes('/orders') || url.pathname.endsWith('/order')) {
      json(ok({ orders: [], items: [], total: 0 }))
      return
    }

    if (url.pathname.includes('/conversations')
      || url.pathname.includes('/conversation')) {
      json(ok({
        id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
        messages: []
      }), url.pathname.includes('messages') ? 200 : 201)
      return
    }

    if (url.pathname.includes('/wearable')) {
      json(ok({ devices: [], metrics: [], items: [] }))
      return
    }

    if (url.pathname.includes('/expert-case')
      || url.pathname.includes('/expert-review')) {
      json(ok({
        id: 'ec-spa-1',
        status: 'awaiting_review',
        items: [],
        packages: []
      }))
      return
    }

    json(ok({ items: [], total: 0 }))
  })

  await new Promise<void>(resolve => server.listen(8080, '127.0.0.1', () => resolve()))
  const port = (server.address() as AddressInfo).port
  return { server, port }
}

let api: Server | undefined
let staticProc: ChildProcess | undefined
const root = fileURLToPath(new URL('../..', import.meta.url))

test.beforeAll(async () => {
  api = (await listenApi()).server
  staticProc = spawn('node', ['scripts/cf-static-server.mjs'], {
    cwd: root,
    env: { ...process.env, PORT: '4173' },
    stdio: 'pipe'
  })
  await new Promise<void>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('static server timeout')), 15_000)
    staticProc?.stdout?.on('data', (buf: Buffer) => {
      if (String(buf).includes('cf-static-server')) {
        clearTimeout(timer)
        resolve()
      }
    })
    staticProc?.stderr?.on('data', (buf: Buffer) => {
      console.error(String(buf))
    })
    staticProc?.on('exit', (code) => {
      clearTimeout(timer)
      reject(new Error(`static server exited ${code}`))
    })
  })
})

test.afterAll(async () => {
  staticProc?.kill('SIGTERM')
  await new Promise<void>(resolve => api?.close(() => resolve()))
})

async function seedMember(page: Page) {
  await page.addInitScript(({ tokenKey, privacyKey }) => {
    localStorage.setItem(tokenKey, 'e2e-member-token')
    localStorage.setItem(privacyKey, '2026-10-24')
  }, { tokenKey: TOKEN_KEY, privacyKey: PRIVACY_KEY })
}

async function seedGuest(page: Page) {
  await page.addInitScript(({ privacyKey }) => {
    localStorage.setItem(privacyKey, '2026-10-24')
  }, { privacyKey: PRIVACY_KEY })
}

async function assertNotHome(page: Page, path: string) {
  await expect(page).toHaveURL(new RegExp(`${path.replace(/\//g, '\\/')}\\/?$`))
  await expect(page.getByTestId('error-page')).toHaveCount(0)
}

test.describe('CloudFront-like static SPA fallback', () => {
  test('CSR chat shell from generate renders /chat', async ({ page }) => {
    await seedGuest(page)
    const errors: string[] = []
    page.on('pageerror', err => errors.push(err.message))
    await page.goto(`${ORIGIN}/chat`, { waitUntil: 'networkidle' })
    await expect(page.getByTestId('user-sidebar')).toBeVisible({ timeout: 20_000 })
    await expect(page.locator('h1')).toContainText(/諮詢|Consult/)
    expect(errors.filter(e => !e.includes('toLocaleString'))).toEqual([])
  })

  test('handoff is a real shell then client-redirects to /chat', async ({ page }) => {
    await seedGuest(page)
    // Static HTML must be a Nuxt shell (check:static-pages rejects meta-refresh stubs).
    const html = await page.request.get(`${ORIGIN}/app/handoff`)
    expect(html.ok()).toBeTruthy()
    const body = await html.text()
    expect(body.length).toBeGreaterThan(512)
    expect(body).toMatch(/#__nuxt|__NUXT__/i)
    expect(body).not.toMatch(/http-equiv\s*=\s*["']?refresh/i)

    await page.goto(`${ORIGIN}/app/handoff`, { waitUntil: 'networkidle' })
    await expect(page).toHaveURL(/\/chat\/?$/, { timeout: 20_000 })
    await expect(page.getByTestId('user-sidebar')).toBeVisible({ timeout: 20_000 })
  })

  test('unknown route shows branded 404 page', async ({ page }) => {
    await seedGuest(page)
    await page.goto(`${ORIGIN}/not-exist-xyz`, {
      waitUntil: 'networkidle'
    })
    await expect(page.getByTestId('error-page')).toBeVisible({ timeout: 20_000 })
    await expect(page.getByTestId('error-page')).toHaveAttribute(
      'data-status',
      '404'
    )
    await expect(page.getByTestId('error-home')).toBeVisible()
  })

  test('member direct-open /app and /app/me after hydrate', async ({ page }) => {
    await seedMember(page)
    await page.goto(`${ORIGIN}/app`, { waitUntil: 'networkidle' })
    await expect(page.getByTestId('health-body')).toBeVisible({ timeout: 20_000 })
    await expect(page.getByTestId('health-auth-gate')).toHaveCount(0)

    await page.goto(`${ORIGIN}/app/me`, { waitUntil: 'networkidle' })
    await expect(page.getByTestId('profile-form')).toBeVisible({ timeout: 20_000 })
    await expect(page.getByTestId('profile-auth-gate')).toHaveCount(0)
  })

  test('member direct-open /login redirects to /app', async ({ page }) => {
    await seedMember(page)
    await page.goto(`${ORIGIN}/login`, { waitUntil: 'networkidle' })
    await expect(page).toHaveURL(/\/app\/?$/, { timeout: 20_000 })
  })

  test('guest home nav Login soft-navs to login form', async ({ page }) => {
    await seedGuest(page)
    await page.goto(`${ORIGIN}/`, { waitUntil: 'networkidle' })
    await expect(page.getByTestId('nav-login')).toBeVisible({ timeout: 20_000 })
    await page.getByTestId('nav-login').click()
    await expect(page).toHaveURL(/\/login\/?$/, { timeout: 20_000 })
    await expect(page.getByTestId('login-form')).toBeVisible({ timeout: 20_000 })
  })

  test('guest direct-open /login shows login form (not home)', async ({ page }) => {
    await seedGuest(page)
    await page.goto(`${ORIGIN}/login`, { waitUntil: 'networkidle' })
    await expect(page).toHaveURL(/\/login\/?$/, { timeout: 20_000 })
    await expect(page.getByTestId('login-form')).toBeVisible({ timeout: 20_000 })
    await expect(page.getByRole('heading', { name: /登入|Log in/i })).toBeVisible()
  })

  test('guest direct-open /app keeps auth gate', async ({ page }) => {
    await seedGuest(page)
    await page.goto(`${ORIGIN}/app`, { waitUntil: 'networkidle' })
    await expect(page.getByTestId('health-auth-gate')).toBeVisible({
      timeout: 20_000
    })
  })
})

for (const dyn of DYNAMIC_PATHS) {
  test.describe(`dynamic ${dyn.name} static shell`, () => {
    test(`guest direct-open ${dyn.path}`, async ({ page }) => {
      await seedGuest(page)
      await page.goto(`${ORIGIN}${dyn.path}`, { waitUntil: 'networkidle' })
      await assertNotHome(page, dyn.path)
      await expect(page.getByTestId(dyn.guestTestId)).toBeVisible({
        timeout: 20_000
      })
    })

    test(`guest F5 on ${dyn.path}`, async ({ page }) => {
      await seedGuest(page)
      await page.goto(`${ORIGIN}${dyn.path}`, { waitUntil: 'networkidle' })
      await expect(page.getByTestId(dyn.guestTestId)).toBeVisible({
        timeout: 20_000
      })
      await page.reload({ waitUntil: 'networkidle' })
      await assertNotHome(page, dyn.path)
      await expect(page.getByTestId(dyn.guestTestId)).toBeVisible({
        timeout: 20_000
      })
    })

    test(`member direct-open ${dyn.path}`, async ({ page }) => {
      await seedMember(page)
      await page.goto(`${ORIGIN}${dyn.path}`, { waitUntil: 'networkidle' })
      await assertNotHome(page, dyn.path)
      await expect(page.getByTestId(dyn.memberTestId)).toBeVisible({
        timeout: 20_000
      })
    })

    test(`member F5 on ${dyn.path}`, async ({ page }) => {
      await seedMember(page)
      await page.goto(`${ORIGIN}${dyn.path}`, { waitUntil: 'networkidle' })
      await expect(page.getByTestId(dyn.memberTestId)).toBeVisible({
        timeout: 20_000
      })
      await page.reload({ waitUntil: 'networkidle' })
      await assertNotHome(page, dyn.path)
      await expect(page.getByTestId(dyn.memberTestId)).toBeVisible({
        timeout: 20_000
      })
    })
  })
}
