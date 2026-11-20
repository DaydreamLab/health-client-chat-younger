import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

describe('/app page shares my-health + login form', () => {
  it('extracts MemberMyHealth; /app uses shell AuthLoginForm (no gate card)', () => {
    const health = readFileSync(
      resolve('app/components/member/MemberMyHealth.vue'),
      'utf8'
    )
    const appIndex = readFileSync(resolve('app/pages/app/index.vue'), 'utf8')
    const shell = readFileSync(
      resolve('app/components/member/MemberAuthShell.vue'),
      'utf8'
    )
    expect(health).toMatch(/data-testid="health-body"/)
    expect(health).not.toMatch(/health-submit-expert-review/)
    expect(health).not.toMatch(/headerCta/)
    expect(health).not.toMatch(/chat\.submitExpertReview/)
    expect(health).not.toMatch(/MemberAuthGate/)
    expect(health).not.toMatch(/definePageMeta/)
    expect(appIndex).toMatch(/MemberMyHealth/)
    expect(appIndex).toMatch(/MemberAuthShell/)
    expect(appIndex).not.toMatch(/MemberAuthGate/)
    expect(appIndex).not.toMatch(/health-auth-gate/)
    expect(appIndex).not.toMatch(/memberGateLocked/)
    expect(shell).toMatch(/AuthLoginForm/)
    expect(existsSync(resolve('app/components/member/MemberAuthGate.vue'))).toBe(false)
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

  it('/app starts as skeleton until auth settled, then login or my-health', () => {
    const page = readFileSync(resolve('app/pages/app/index.vue'), 'utf8')
    const shell = readFileSync(
      resolve('app/components/member/MemberAuthShell.vue'),
      'utf8'
    )
    expect(existsSync(resolve('app/pages/dashboard.vue'))).toBe(false)
    expect(page).toMatch(/MemberAuthShell/)
    expect(page).toMatch(/skeleton-test-id="app-skeleton"/)
    expect(page).toMatch(/login-test-id="app-login"/)
    expect(page).toMatch(/MemberMyHealth/)
    expect(page).not.toMatch(/MemberAuthGate/)
    expect(page).toMatch(/layout:\s*['"]user['"]/)
    expect(shell).toMatch(/AuthLoginForm/)
    expect(shell).toMatch(/\bstay\b/)
    expect(shell).toMatch(/!settled/)
    expect(shell).toMatch(/!auth\.isMember/)
    expect(shell).toMatch(/MemberPageSkeleton/)
    expect(shell).toMatch(/useAuthClientSync/)
  })

  it('does not keep a /dashboard page or nav entry', () => {
    expect(existsSync(resolve('app/pages/dashboard.vue'))).toBe(false)
    const userLayout = readFileSync(resolve('app/layouts/user.vue'), 'utf8')
    const defaultLayout = readFileSync(resolve('app/layouts/default.vue'), 'utf8')
    expect(userLayout).not.toMatch(/\/dashboard/)
    expect(defaultLayout).not.toMatch(/\/dashboard/)
  })
})
