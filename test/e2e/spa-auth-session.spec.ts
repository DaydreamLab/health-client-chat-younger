/**
 * Auth session resilience against CloudFront-like static hosting.
 * Mock API only — no real model or prod backend.
 *
 * Covers: refresh rotation, refresh 401 while me OK, concurrent refresh
 * single-flight, member direct-open /login → /app (zh + /en).
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
const ORIGIN = 'http://127.0.0.1:4174'
const STATIC_PORT = '4174'
const API_PORT = 8081

const MEMBER = {
  id: 'm1',
  role: 'member' as const,
  email: 'guest@example.com',
  display_name: 'Guest'
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

/** Unsigned JWT so client can read iat/exp for session-slide. */
function fakeJwt(iatSec: number, expSec: number, sub = 'm1') {
  const header = Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' }))
    .toString('base64url')
  const payload = Buffer.from(JSON.stringify({
    sub,
    role: 'member',
    act: 'user',
    iat: iatSec,
    exp: expSec
  })).toString('base64url')
  return `${header}.${payload}.sig`
}

/** Aged iat so shouldSlideSession is true on cold load. */
function agedMemberJwt(sub = 'm1') {
  const nowSec = Math.floor(Date.now() / 1000)
  return fakeJwt(nowSec - 6 * 60, nowSec + 3600, sub)
}

function bearerToken(authHeader: string | undefined): string | null {
  if (!authHeader?.startsWith('Bearer ')) {
    return null
  }
  return authHeader.slice('Bearer '.length).trim() || null
}

type ApiMode = 'rotate' | 'refresh401-me-ok'

function listenApi(mode: ApiMode): Promise<{
  server: Server
  port: number
  stats: { refresh: number, me: number, guest: number }
  seedToken: string
}> {
  const stats = { refresh: 0, me: 0, guest: 0 }
  let seq = 0
  const seedToken = agedMemberJwt('seed')
  /** Tokens still accepted for refresh (rotation drops the previous). */
  const refreshable = new Set<string>([seedToken])
  /** Tokens still accepted for /users/me (keep prior JWTs — core-like). */
  const meOk = new Set<string>([seedToken])

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

    if (url.pathname.endsWith('/auth/guest')) {
      stats.guest += 1
      json(ok({
        token: 'e2e-guest-token',
        expires_in: 3600,
        user: { id: 'g1', role: 'guest', email: null, display_name: null }
      }), 201)
      return
    }

    if (url.pathname.endsWith('/auth/refresh')) {
      stats.refresh += 1
      if (mode === 'refresh401-me-ok') {
        json(fail('refresh denied'), 401)
        return
      }
      if (!token || !refreshable.has(token)) {
        json(fail('invalid token'), 401)
        return
      }
      seq += 1
      const nowSec = Math.floor(Date.now() / 1000)
      const next = fakeJwt(nowSec, nowSec + 3600, `m1-r${seq}`)
      refreshable.delete(token)
      refreshable.add(next)
      meOk.add(next)
      json(ok({
        token: next,
        expires_in: 3600,
        user: MEMBER
      }))
      return
    }

    if (url.pathname.endsWith('/users/me')) {
      stats.me += 1
      if (token && meOk.has(token)) {
        json(ok({
          ...MEMBER,
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
    if (url.pathname.includes('/health-reports') || url.pathname.includes('/reports')) {
      json(ok({ items: [], total: 0 }))
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
    if (url.pathname.includes('/expert-case') || url.pathname.includes('/expert-review')) {
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

  return new Promise((resolve) => {
    server.listen(API_PORT, '127.0.0.1', () => {
      const port = (server.address() as AddressInfo).port
      resolve({ server, port, stats, seedToken })
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

async function seedMember(page: Page, token: string) {
  await page.addInitScript(({ tokenKey, privacyKey, value }) => {
    localStorage.setItem(tokenKey, value)
    localStorage.setItem(privacyKey, '2026-10-24')
  }, { tokenKey: TOKEN_KEY, privacyKey: PRIVACY_KEY, value: token })
}

/** Rewrite baked apiBase (typically :8080) to this suite's mock (:8081). */
async function rewriteApi(page: Page) {
  await page.route('**/api/v1/**', async (route) => {
    const url = new URL(route.request().url())
    url.protocol = 'http:'
    url.hostname = '127.0.0.1'
    url.port = String(API_PORT)
    await route.continue({ url: url.toString() })
  })
}

test.describe.serial('spa auth session', () => {
  let api: Awaited<ReturnType<typeof listenApi>>
  let staticProc: ChildProcess

  test.beforeAll(async () => {
    api = await listenApi('rotate')
    staticProc = await startStatic()
  })

  test.afterAll(async () => {
    staticProc.kill('SIGTERM')
    await new Promise<void>(resolve => api.server.close(() => resolve()))
  })

  test('member keeps session under refresh rotation (zh)', async ({ page }) => {
    await rewriteApi(page)
    await seedMember(page, api.seedToken)
    api.stats.guest = 0

    await page.goto(`${ORIGIN}/login`, { waitUntil: 'networkidle' })
    await expect(page).toHaveURL(/\/app\/?$/, { timeout: 20_000 })
    const afterLogin = await page.evaluate(key => localStorage.getItem(key), TOKEN_KEY)
    expect(afterLogin).toBeTruthy()
    expect(afterLogin).not.toBe('e2e-guest-token')

    await page.goto(`${ORIGIN}/app`, { waitUntil: 'networkidle' })
    await expect(page.getByTestId('health-body')).toBeVisible({ timeout: 20_000 })
    await expect(page.getByTestId('health-auth-gate')).toHaveCount(0)

    await page.goto(`${ORIGIN}/app/me`, { waitUntil: 'networkidle' })
    await expect(page.getByTestId('profile-form')).toBeVisible({ timeout: 20_000 })
    await expect(page.getByTestId('profile-auth-gate')).toHaveCount(0)
    expect(api.stats.guest).toBe(0)
  })

  test('member keeps session under refresh rotation (/en)', async ({ page }) => {
    await new Promise<void>(resolve => api.server.close(() => resolve()))
    api = await listenApi('rotate')
    await rewriteApi(page)
    await seedMember(page, api.seedToken)
    api.stats.guest = 0

    await page.goto(`${ORIGIN}/en/login`, { waitUntil: 'networkidle' })
    await expect(page).toHaveURL(/\/en\/app\/?$/, { timeout: 20_000 })

    await page.goto(`${ORIGIN}/en/app`, { waitUntil: 'networkidle' })
    await expect(page.getByTestId('health-body')).toBeVisible({ timeout: 20_000 })
    await expect(page.getByTestId('health-auth-gate')).toHaveCount(0)

    await page.goto(`${ORIGIN}/en/app/me`, { waitUntil: 'networkidle' })
    await expect(page.getByTestId('profile-form')).toBeVisible({ timeout: 20_000 })
    expect(api.stats.guest).toBe(0)
  })

  test('concurrent ensureSession hits refresh at most once', async ({ page }) => {
    await new Promise<void>(resolve => api.server.close(() => resolve()))
    api = await listenApi('rotate')
    await rewriteApi(page)
    await seedMember(page, api.seedToken)
    api.stats.refresh = 0
    api.stats.guest = 0

    await page.goto(`${ORIGIN}/app`, { waitUntil: 'networkidle' })
    await expect(page.getByTestId('health-body')).toBeVisible({ timeout: 20_000 })
    expect(api.stats.refresh).toBe(1)
    expect(api.stats.guest).toBe(0)
  })

  test('refresh 401 with valid me does not clear member token', async ({ page }) => {
    await new Promise<void>(resolve => api.server.close(() => resolve()))
    api = await listenApi('refresh401-me-ok')
    await rewriteApi(page)
    await seedMember(page, api.seedToken)
    api.stats.guest = 0
    api.stats.refresh = 0

    await page.goto(`${ORIGIN}/login`, { waitUntil: 'networkidle' })
    await expect(page).toHaveURL(/\/app\/?$/, { timeout: 20_000 })
    expect(api.stats.refresh).toBeGreaterThanOrEqual(1)
    expect(await page.evaluate(key => localStorage.getItem(key), TOKEN_KEY))
      .toBe(api.seedToken)
    expect(api.stats.guest).toBe(0)

    await page.goto(`${ORIGIN}/app`, { waitUntil: 'networkidle' })
    await expect(page.getByTestId('health-body')).toBeVisible({ timeout: 20_000 })
    await expect(page.getByTestId('health-auth-gate')).toHaveCount(0)
    expect(await page.evaluate(key => localStorage.getItem(key), TOKEN_KEY))
      .toBe(api.seedToken)
    expect(api.stats.guest).toBe(0)
  })
})
