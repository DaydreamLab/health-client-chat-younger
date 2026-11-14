import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

describe('dashboard page shares my-health + login form', () => {
  it('extracts MemberMyHealth and keeps /app as a thin auth gate wrapper', () => {
    const health = readFileSync(
      resolve('app/components/member/MemberMyHealth.vue'),
      'utf8'
    )
    const appIndex = readFileSync(resolve('app/pages/app/index.vue'), 'utf8')
    expect(health).toMatch(/data-testid="health-body"/)
    expect(health).not.toMatch(/MemberAuthGate/)
    expect(health).not.toMatch(/definePageMeta/)
    expect(appIndex).toMatch(/MemberAuthGate/)
    expect(appIndex).toMatch(/MemberMyHealth/)
    expect(appIndex).toMatch(/health-auth-gate/)
    expect(appIndex).toMatch(/memberGateLocked/)
  })

  it('extracts AuthLoginForm; login page stays a redirecting wrapper', () => {
    const form = readFileSync(resolve('app/components/AuthLoginForm.vue'), 'utf8')
    const login = readFileSync(resolve('app/pages/login.vue'), 'utf8')
    expect(form).toMatch(/data-testid="login-form"/)
    expect(form).toMatch(/stay\?:/)
    expect(login).toMatch(/AuthLoginForm/)
    expect(login).toMatch(/auth\.isMember/)
    expect(login).toMatch(/navigateTo\(redirectTarget\(\)\)/)
    expect(login).not.toMatch(/data-testid="login-form"/)
  })

  it('dashboard starts as skeleton until auth settled, then login or my-health', () => {
    const page = readFileSync(resolve('app/pages/dashboard.vue'), 'utf8')
    expect(existsSync(resolve('app/pages/dashboard.vue'))).toBe(true)
    expect(page).toMatch(/data-testid="dashboard-skeleton"/)
    expect(page).toMatch(/data-testid="dashboard-login"/)
    expect(page).toMatch(/!settled/)
    expect(page).toMatch(/!auth\.isMember/)
    expect(page).toMatch(/MemberMyHealth/)
    expect(page).toMatch(/AuthLoginForm/)
    expect(page).toMatch(/\bstay\b/)
    expect(page).not.toMatch(/MemberAuthGate/)
    expect(page).toMatch(/useAuthClientSync/)
    expect(page).toMatch(/layout:\s*['"]user['"]/)
  })

  it('does not add dashboard to nav entry points', () => {
    const userLayout = readFileSync(resolve('app/layouts/user.vue'), 'utf8')
    const defaultLayout = readFileSync(resolve('app/layouts/default.vue'), 'utf8')
    expect(userLayout).not.toMatch(/\/dashboard/)
    expect(defaultLayout).not.toMatch(/\/dashboard/)
  })
})
