/**
 * /app static SPA: skeleton → login or my-health after ensureSession.
 * Mock API only — no real model or prod backend.
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
const ORIGIN = 'http://127.0.0.1:4175'
const STATIC_PORT = '4175'
const API_PORT = 8082

const MEMBER = {
  id: 'm1',
  role: 'member' as const,
  email: 'guest@example.com',
  display_name: 'Guest'
}

const GUEST = {
  id: 'g1',
  role: 'guest' as const,
  email: null,
  display_name: null
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
      return
    }

    if (url.pathname.endsWith('/users/me')) {
      if (isMember) {
        json(ok({
          ...MEMBER,
          created_at: '2026-01-01T00:00:00Z',
          default_recipient: null
        }))
        return
      }
      if (token) {
        json(ok({
          ...GUEST,
          created_at: '2026-01-01T00:00:00Z',
          default_recipient: null
        }))
        return
      }
      json(fail('unauthorized'), 401)
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
    if (url.pathname.includes('/profile') || url.pathname.includes('/health-profile')) {
      json(ok({
        sex: null,
        age_years: null,
        height_cm: null,
        weight_kg: null,
        diet: null,
        goals: []
      }))
      return
    }
    if (url.pathname.includes('/health-reports') || url.pathname.includes('/reports')) {
      json(ok({ reports: [], total: 0 }))
      return
    }
    if (url.pathname.includes('/notifications')) {
      json(ok({ items: [], unread_count: 0, total: 0 }))
      return
    }
    if (url.pathname.includes('/orders') || url.pathname.includes('/order')) {
      json(ok({ orders: [], items: [], total: 0 }))
      return
    }
    if (url.pathname.includes('/conversations') || url.pathname.includes('/conversation')) {
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

    json(ok({ items: [], total: 0 }))
  })

  return new Promise((resolve) => {
    server.listen(API_PORT, '127.0.0.1', () => {
      const port = (server.address() as AddressInfo).port
      resolve({ server, port })
    })
  })
}

const root = fileURLToPath(new URL('../..', import.meta.url))

async function startStatic(): Promise<ChildProcess> {
  const proc = spawn('node', ['scripts/cf-static-server.mjs'], {
    cwd: root,
    env: { ...process.env, PORT: STATIC_PORT },
    stdio: 'pipe'
  })
  await new Promise<void>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('static server timeout')), 15_000)
    proc.stdout?.on('data', (buf: Buffer) => {
      if (String(buf).includes('cf-static-server')) {
        clearTimeout(timer)
        resolve()
      }
    })
    proc.stderr?.on('data', (buf: Buffer) => {
      console.error(String(buf))
    })
    proc.on('exit', (code) => {
      clearTimeout(timer)
      reject(new Error(`static server exited ${code}`))
    })
  })
  return proc
}

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

async function rewriteApi(page: Page) {
  await page.route('**/api/v1/**', async (route) => {
    const url = new URL(route.request().url())
    url.protocol = 'http:'
    url.hostname = '127.0.0.1'
    url.port = String(API_PORT)
    await route.continue({ url: url.toString() })
  })
}

async function installFlashProbe(page: Page) {
  await page.addInitScript(() => {
    type Flash = {
      skeleton: boolean
      login: boolean
      gate: boolean
      health: boolean
    }
    const g = globalThis as typeof globalThis & { __appFlash?: Flash }
    const flash: Flash = {
      skeleton: false,
      login: false,
      gate: false,
      health: false
    }
    g.__appFlash = flash

    const tick = () => {
      if (document.querySelector('[data-testid="app-skeleton"]')) {
        flash.skeleton = true
      }
      if (document.querySelector('[data-testid="app-login"]')) {
        flash.login = true
      }
      if (document.querySelector('[data-testid="health-auth-gate"]')) {
        flash.gate = true
      }
      if (document.querySelector('[data-testid="health-body"]')) {
        flash.health = true
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
  })
}

async function readFlash(page: Page) {
  // Final sync tick so the settled DOM is always reflected.
  return page.evaluate(() => {
    const g = globalThis as typeof globalThis & {
      __appFlash?: {
        skeleton: boolean
        login: boolean
        gate: boolean
        health: boolean
      }
    }
    const flash = g.__appFlash
    if (!flash) {
      throw new Error('flash probe missing — installFlashProbe before navigation')
    }
    if (document.querySelector('[data-testid="app-skeleton"]')) {
      flash.skeleton = true
    }
    if (document.querySelector('[data-testid="app-login"]')) {
      flash.login = true
    }
    if (document.querySelector('[data-testid="health-auth-gate"]')) {
      flash.gate = true
    }
    if (document.querySelector('[data-testid="health-body"]')) {
      flash.health = true
    }
    return { ...flash }
  })
}

async function assertStaticSkeleton(path: string) {
  const res = await fetch(`${ORIGIN}${path}`)
  expect(res.ok).toBeTruthy()
  const html = await res.text()
  expect(html).toMatch(/app-skeleton/)
  expect(html).not.toMatch(/app-login/)
  expect(html).not.toMatch(/health-auth-gate/)
  expect(html).not.toMatch(/health-body/)
  expect(html).not.toMatch(/login-form/)
}

test.describe.serial('spa app', () => {
  let api: Awaited<ReturnType<typeof listenApi>>
  let staticProc: ChildProcess

  test.beforeAll(async () => {
    api = await listenApi()
    staticProc = await startStatic()
  })

  test.afterAll(async () => {
    staticProc.kill('SIGTERM')
    await new Promise<void>(resolve => api.server.close(() => resolve()))
  })

  test('static HTML for /app and /en/app is skeleton only', async () => {
    await assertStaticSkeleton('/app')
    await assertStaticSkeleton('/en/app')
  })

  for (const path of ['/app', '/en/app'] as const) {
    test(`guest direct-open ${path}: skeleton → login form`, async ({ page }) => {
      await rewriteApi(page)
      await seedGuest(page)
      await installFlashProbe(page)
      await page.goto(`${ORIGIN}${path}`, { waitUntil: 'networkidle' })
      await expect(page).toHaveURL(new RegExp(`${path.replace(/\//g, '\\/')}\\/?$`))
      await expect(page.getByTestId('app-login')).toBeVisible({ timeout: 20_000 })
      await expect(page.getByTestId('login-form')).toBeVisible()
      await expect(page.getByTestId('health-body')).toHaveCount(0)
      await expect(page.getByTestId('health-auth-gate')).toHaveCount(0)
      const flash = await readFlash(page)
      // Skeleton may be replaced before the probe attaches; static HTML test covers it.
      expect(flash.login).toBe(true)
      expect(flash.gate).toBe(false)
      expect(flash.health).toBe(false)
    })

    test(`guest F5 on ${path}: skeleton → login form`, async ({ page }) => {
      await rewriteApi(page)
      await seedGuest(page)
      await page.goto(`${ORIGIN}${path}`, { waitUntil: 'networkidle' })
      await expect(page.getByTestId('app-login')).toBeVisible({ timeout: 20_000 })
      await installFlashProbe(page)
      await page.reload({ waitUntil: 'networkidle' })
      await expect(page).toHaveURL(new RegExp(`${path.replace(/\//g, '\\/')}\\/?$`))
      await expect(page.getByTestId('app-login')).toBeVisible({ timeout: 20_000 })
      await expect(page.getByTestId('health-auth-gate')).toHaveCount(0)
      const flash = await readFlash(page)
      expect(flash.gate).toBe(false)
      expect(flash.health).toBe(false)
    })

    test(`guest in-page login on ${path} stays and shows my-health`, async ({ page }) => {
      await rewriteApi(page)
      await seedGuest(page)
      await page.goto(`${ORIGIN}${path}`, { waitUntil: 'networkidle' })
      await expect(page.getByTestId('login-form')).toBeVisible({ timeout: 20_000 })
      await page.locator('input[type="email"]').fill('guest@example.com')
      await page.locator('input[type="password"]').fill('password12345')
      await page.getByTestId('login-form').locator('button[type="submit"]').click()
      await expect(page.getByTestId('health-body')).toBeVisible({ timeout: 20_000 })
      await expect(page).toHaveURL(new RegExp(`${path.replace(/\//g, '\\/')}\\/?$`))
      await expect(page.getByTestId('app-login')).toHaveCount(0)
      await expect(page.getByTestId('health-auth-gate')).toHaveCount(0)
    })

    test(`member direct-open ${path}: skeleton → my-health, no guest UI`, async ({ page }) => {
      await rewriteApi(page)
      await seedMember(page)
      await installFlashProbe(page)
      await page.goto(`${ORIGIN}${path}`, { waitUntil: 'networkidle' })
      await expect(page).toHaveURL(new RegExp(`${path.replace(/\//g, '\\/')}\\/?$`))
      await expect(page.getByTestId('health-body')).toBeVisible({ timeout: 20_000 })
      await expect(page.getByTestId('app-login')).toHaveCount(0)
      await expect(page.getByTestId('health-auth-gate')).toHaveCount(0)
      const flash = await readFlash(page)
      // Skeleton may be replaced before the probe attaches; static HTML test covers it.
      expect(flash.health).toBe(true)
      expect(flash.login).toBe(false)
      expect(flash.gate).toBe(false)
    })

    test(`member F5 on ${path}: skeleton → my-health, no guest UI`, async ({ page }) => {
      await rewriteApi(page)
      await seedMember(page)
      await page.goto(`${ORIGIN}${path}`, { waitUntil: 'networkidle' })
      await expect(page.getByTestId('health-body')).toBeVisible({ timeout: 20_000 })
      await installFlashProbe(page)
      await page.reload({ waitUntil: 'networkidle' })
      await expect(page).toHaveURL(new RegExp(`${path.replace(/\//g, '\\/')}\\/?$`))
      await expect(page.getByTestId('health-body')).toBeVisible({ timeout: 20_000 })
      await expect(page.getByTestId('app-login')).toHaveCount(0)
      await expect(page.getByTestId('health-auth-gate')).toHaveCount(0)
      const flash = await readFlash(page)
      expect(flash.login).toBe(false)
      expect(flash.gate).toBe(false)
      expect(flash.health).toBe(true)
    })
  }
})
