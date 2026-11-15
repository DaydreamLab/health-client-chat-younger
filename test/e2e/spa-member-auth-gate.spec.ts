/**
 * Member surfaces: skeleton while ensureSession is in flight; no guest/login flash.
 * Guest sees shared AuthLoginForm (stay); login keeps URL and shows page content.
 * Mock API only — no real model or prod backend.
 *
 * Run: pnpm generate && pnpm test:e2e:spa
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
import { e2eArtifactPath } from './helpers/artifacts-dir'

const TOKEN_KEY = 'candor.guest.token'
const PRIVACY_KEY = 'candor.privacy.consent.version'
const ORIGIN = 'http://127.0.0.1:4176'
const STATIC_PORT = '4176'
const SESSION_DELAY_MS = 1200

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

/** Pages that use MemberAuthShell (or checkout equivalent) with inline AuthLoginForm. */
const PAGES = [
  {
    path: '/app/orders',
    skeleton: 'orders-auth-skeleton',
    login: 'orders-login',
    memberIds: ['orders-list', 'orders-empty'],
    shot: 'orders'
  },
  {
    path: '/app/me',
    skeleton: 'profile-auth-skeleton',
    login: 'profile-login',
    memberIds: ['profile-form'],
    shot: 'me'
  },
  {
    path: '/app/notifications',
    skeleton: 'notifications-auth-skeleton',
    login: 'notifications-login',
    memberIds: ['notifications-empty', 'notifications-list'],
    shot: 'notifications'
  },
  {
    path: '/app',
    skeleton: 'app-skeleton',
    login: 'app-login',
    memberIds: ['health-body'],
    shot: 'app'
  },
  {
    path: '/app/checkout',
    skeleton: 'checkout-auth-skeleton',
    login: 'checkout-login',
    // Default kind is expert_plan; without conversation member sees list error (not the guest login shell).
    memberIds: ['expert-plans-error', 'checkout-conversation-missing'],
    shot: 'checkout'
  },
  {
    path: '/expert-booking',
    skeleton: 'expert-booking-auth-skeleton',
    login: 'expert-booking-login',
    memberIds: ['expert-booking-form-shell'],
    shot: 'expert-booking'
  },
  {
    path: '/expert-booking/confirm',
    skeleton: 'expert-booking-confirm-auth-skeleton',
    login: 'expert-booking-confirm-login',
    memberIds: ['expert-booking-confirm-empty'],
    shot: 'expert-booking-confirm'
  },
  {
    path: '/en/app/orders',
    skeleton: 'orders-auth-skeleton',
    login: 'orders-login',
    memberIds: ['orders-list', 'orders-empty'],
    shot: 'en-orders'
  },
  {
    path: '/en/app/me',
    skeleton: 'profile-auth-skeleton',
    login: 'profile-login',
    memberIds: ['profile-form'],
    shot: 'en-me'
  }
] as const

/** Subset used for in-page login stay assertions (incl. /en). */
const LOGIN_STAY_PAGES = [
  {
    path: '/app/orders',
    login: 'orders-login',
    memberIds: ['orders-list', 'orders-empty']
  },
  {
    path: '/app/me',
    login: 'profile-login',
    memberIds: ['profile-form']
  },
  {
    path: '/en/app/orders',
    login: 'orders-login',
    memberIds: ['orders-list', 'orders-empty']
  },
  {
    path: '/en/app/me',
    login: 'profile-login',
    memberIds: ['profile-form']
  }
] as const

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

function listenApi(): Promise<{ server: Server, port: number }> {
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

    const respondLater = (fn: () => void) => {
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
      respondLater(() => {
        if (isMember) {
          json(ok({
            token: 'e2e-member-token',
            expires_in: 3600,
            user: MEMBER
          }))
          return
        }
        json(ok({
          token: 'e2e-guest-token',
          expires_in: 3600,
          user: GUEST
        }))
      })
      return
    }

    if (url.pathname.endsWith('/users/me')) {
      respondLater(() => {
        if (isMember) {
          json(ok(MEMBER))
          return
        }
        json(fail('unauthorized'), 401)
      })
      return
    }

    if (url.pathname.includes('/orders') || url.pathname.endsWith('/order')) {
      json(ok({ orders: [], items: [], total: 0 }))
      return
    }

    if (/\/order\/[^/]+$/.test(url.pathname)) {
      json(fail('not found', 'not_found'), 404)
      return
    }

    if (url.pathname.includes('/notifications')) {
      json(ok({ items: [], unread_count: 0, total: 0 }))
      return
    }

    if (url.pathname.includes('/profile')
      || url.pathname.includes('/health-profile')
      || url.pathname.includes('/users/me/health')) {
      json(ok({
        sex: null,
        age: null,
        height_cm: null,
        weight_kg: null,
        goals: [],
        display_name: MEMBER.display_name
      }))
      return
    }

    if (url.pathname.includes('/health-reports') || url.pathname.includes('/reports')) {
      json(ok({ items: [], total: 0 }))
      return
    }

    if (url.pathname.includes('/expert-booking-product')) {
      json(ok({
        code: 'expert_booking',
        name_zh: '專家諮詢',
        name_en: 'Expert consult',
        description: 'desc',
        description_en: 'desc',
        price: 6500,
        currency: 'TWD',
        active: true
      }))
      return
    }

    if (url.pathname.includes('/checkout/preview')) {
      json(fail('conversation required', 'invalid_request'), 422)
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

    json(ok({}))
  })

  return new Promise((resolve) => {
    server.listen(0, '127.0.0.1', () => {
      const addr = server.address() as AddressInfo
      resolve({ server, port: addr.port })
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
  await new Promise<void>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('static server timeout')), 15_000)
    child.stdout?.on('data', (buf: Buffer) => {
      if (String(buf).includes('listening') || String(buf).includes(STATIC_PORT)) {
        clearTimeout(timer)
        resolve()
      }
    })
    child.stderr?.on('data', () => {})
    setTimeout(() => {
      clearTimeout(timer)
      resolve()
    }, 800)
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

async function seedMember(page: Page) {
  await page.addInitScript(({ tokenKey, privacyKey }) => {
    localStorage.setItem(tokenKey, 'e2e-member-token')
    localStorage.setItem(privacyKey, '2026-10-24')
  }, { tokenKey: TOKEN_KEY, privacyKey: PRIVACY_KEY })
}

async function seedGuest(page: Page) {
  await page.addInitScript(({ tokenKey, privacyKey }) => {
    localStorage.setItem(tokenKey, 'e2e-guest-token')
    localStorage.setItem(privacyKey, '2026-10-24')
  }, { tokenKey: TOKEN_KEY, privacyKey: PRIVACY_KEY })
}

async function installFlashProbe(
  page: Page,
  ids: { skeleton: string, login: string, memberIds: readonly string[] }
) {
  await page.addInitScript(({ skeleton, login, memberIds }) => {
    type Flash = {
      skeleton: boolean
      login: boolean
      member: boolean
    }
    const g = globalThis as typeof globalThis & { __memberAuthFlash?: Flash }
    const flash: Flash = { skeleton: false, login: false, member: false }
    g.__memberAuthFlash = flash

    const tick = () => {
      if (document.querySelector(`[data-testid="${skeleton}"]`)) {
        flash.skeleton = true
      }
      if (
        document.querySelector(`[data-testid="${login}"]`)
        || document.querySelector('[data-testid="login-form"]')
      ) {
        flash.login = true
      }
      if (memberIds.some(id => document.querySelector(`[data-testid="${id}"]`))) {
        flash.member = true
      }
    }

    const start = () => {
      tick()
      new MutationObserver(tick).observe(document.documentElement, {
        childList: true,
        subtree: true
      })
    }

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', start, { once: true })
    } else {
      start()
    }
  }, ids)
}

async function readFlash(page: Page) {
  return page.evaluate(() => {
    const g = globalThis as typeof globalThis & {
      __memberAuthFlash?: {
        skeleton: boolean
        login: boolean
        member: boolean
      }
    }
    const flash = g.__memberAuthFlash
    if (!flash) {
      throw new Error('flash probe missing')
    }
    return { ...flash }
  })
}

async function assertStaticSkeleton(path: string, skeletonId: string, loginId: string) {
  const res = await fetch(`${ORIGIN}${path}`)
  expect(res.ok).toBeTruthy()
  const html = await res.text()
  expect(html).toMatch(new RegExp(skeletonId))
  expect(html).not.toMatch(new RegExp(loginId))
  expect(html).not.toMatch(/login-form/)
}

function memberLocator(page: Page, ids: readonly string[]) {
  let loc = page.getByTestId(ids[0]!)
  for (const id of ids.slice(1)) {
    loc = loc.or(page.getByTestId(id))
  }
  return loc.first()
}

function pathRegex(path: string) {
  const escaped = path.replace(/\//g, '\\/')
  return new RegExp(`${escaped}\\/?(\\?.*)?$`)
}

test.describe.serial('spa member auth gate', () => {
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

  for (const pageDef of PAGES) {
    test(`static HTML for ${pageDef.path} is skeleton only`, async () => {
      await assertStaticSkeleton(pageDef.path, pageDef.skeleton, pageDef.login)
    })
  }

  for (const pageDef of PAGES) {
    test(`member direct-open ${pageDef.path}: skeleton → member, no login flash`, async ({ page }) => {
      await rewriteApi(page, api.port)
      await seedMember(page)
      await installFlashProbe(page, {
        skeleton: pageDef.skeleton,
        login: pageDef.login,
        memberIds: pageDef.memberIds
      })
      await page.goto(`${ORIGIN}${pageDef.path}`, { waitUntil: 'domcontentloaded' })

      await expect(page.getByTestId(pageDef.skeleton)).toBeVisible({ timeout: 5_000 })
      await page.screenshot({
        path: e2eArtifactPath(`auth-gate-after-${pageDef.shot}-mid.png`),
        fullPage: true
      })
      await expect(page.getByTestId(pageDef.login)).toHaveCount(0)
      await expect(page.getByTestId('login-form')).toHaveCount(0)

      const settled = memberLocator(page, pageDef.memberIds)
      await expect(settled).toBeVisible({ timeout: 20_000 })
      await expect(page.getByTestId(pageDef.login)).toHaveCount(0)
      await expect(page.getByTestId('login-form')).toHaveCount(0)
      await page.screenshot({
        path: e2eArtifactPath(`auth-gate-after-${pageDef.shot}-settled.png`),
        fullPage: true
      })

      const flash = await readFlash(page)
      expect(flash.skeleton).toBe(true)
      expect(flash.login).toBe(false)
      expect(flash.member).toBe(true)
    })

    test(`member F5 on ${pageDef.path}: no login flash`, async ({ page }) => {
      await rewriteApi(page, api.port)
      await seedMember(page)
      await page.goto(`${ORIGIN}${pageDef.path}`, { waitUntil: 'networkidle' })
      const settled = memberLocator(page, pageDef.memberIds)
      await expect(settled).toBeVisible({ timeout: 20_000 })

      await installFlashProbe(page, {
        skeleton: pageDef.skeleton,
        login: pageDef.login,
        memberIds: pageDef.memberIds
      })
      await page.reload({ waitUntil: 'domcontentloaded' })
      await expect(page.getByTestId(pageDef.login)).toHaveCount(0)
      await expect(page.getByTestId('login-form')).toHaveCount(0)
      await expect(settled).toBeVisible({ timeout: 20_000 })
      const flash = await readFlash(page)
      expect(flash.login).toBe(false)
    })

    test(`guest direct-open ${pageDef.path}: skeleton → login form`, async ({ page }) => {
      await rewriteApi(page, api.port)
      await seedGuest(page)
      await page.goto(`${ORIGIN}${pageDef.path}`, { waitUntil: 'domcontentloaded' })
      await expect(page.getByTestId(pageDef.skeleton)).toBeVisible({ timeout: 5_000 })
      await expect(page.getByTestId(pageDef.login)).toBeVisible({ timeout: 20_000 })
      await expect(page.getByTestId('login-form')).toBeVisible()
      for (const id of pageDef.memberIds) {
        if (id.endsWith('-loading')) {
          continue
        }
        await expect(page.getByTestId(id)).toHaveCount(0)
      }
    })
  }

  for (const pageDef of LOGIN_STAY_PAGES) {
    test(`guest in-page login on ${pageDef.path} stays and shows content`, async ({ page }) => {
      await rewriteApi(page, api.port)
      await seedGuest(page)
      await page.goto(`${ORIGIN}${pageDef.path}`, { waitUntil: 'networkidle' })
      await expect(page.getByTestId('login-form')).toBeVisible({ timeout: 20_000 })
      await page.locator('input[type="email"]').fill('guest@example.com')
      await page.locator('input[type="password"]').fill('password12345')
      await page.getByTestId('login-form').locator('button[type="submit"]').click()
      const settled = memberLocator(page, pageDef.memberIds)
      await expect(settled).toBeVisible({ timeout: 20_000 })
      await expect(page).toHaveURL(pathRegex(pageDef.path))
      await expect(page.getByTestId(pageDef.login)).toHaveCount(0)
      await expect(page.getByTestId('login-form')).toHaveCount(0)
    })
  }
})
