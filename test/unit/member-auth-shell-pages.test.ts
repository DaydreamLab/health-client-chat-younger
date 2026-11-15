import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const gatedPages = [
  'app/pages/app/orders/index.vue',
  'app/pages/app/orders/[id].vue',
  'app/pages/app/me.vue',
  'app/pages/app/notifications.vue',
  'app/pages/expert-booking/index.vue',
  'app/pages/expert-booking/confirm.vue',
  'app/pages/app/index.vue'
] as const

describe('member auth shell on gated pages', () => {
  for (const page of gatedPages) {
    it(`${page} uses MemberAuthShell skeleton before inline login`, () => {
      const source = readFileSync(resolve(page), 'utf8')
      expect(source).toMatch(/MemberAuthShell/)
      expect(source).toMatch(/skeleton-test-id=/)
      expect(source).not.toMatch(/MemberAuthGate/)
      expect(source).not.toMatch(/gate-test-id=/)
      // Must not show login while pending via old memberGateLocked pattern.
      expect(source).not.toMatch(/v-if="gateLocked"/)
      expect(source).not.toMatch(/memberGateLocked:\s*gateLocked/)
    })
  }

  it('shell default guest slot is AuthLoginForm stay', () => {
    const shell = readFileSync(
      resolve('app/components/member/MemberAuthShell.vue'),
      'utf8'
    )
    expect(shell).toMatch(/AuthLoginForm/)
    expect(shell).toMatch(/\bstay\b/)
    expect(shell).toMatch(/show-description="false"/)
    expect(shell).toMatch(/show-guest-link="false"/)
  })

  it('checkout waits for settled before AuthLoginForm', () => {
    const source = readFileSync(resolve('app/pages/app/checkout.vue'), 'utf8')
    expect(source).toMatch(/checkout-auth-skeleton/)
    expect(source).toMatch(/!settled/)
    expect(source).toMatch(/useAuthClientSync/)
    expect(source).toMatch(/AuthLoginForm/)
    expect(source).toMatch(/\bstay\b/)
    expect(source).not.toMatch(/MemberAuthGate/)
    expect(source).not.toMatch(/auth\.ready\s*&&\s*!auth\.isMember/)
  })

  it('checkout and confirm reload member data when isMember becomes true', () => {
    const checkout = readFileSync(resolve('app/pages/app/checkout.vue'), 'utf8')
    const confirm = readFileSync(
      resolve('app/pages/expert-booking/confirm.vue'),
      'utf8'
    )
    expect(checkout).toMatch(/watch\(\(\) => auth\.isMember/)
    expect(checkout).toMatch(/loadCheckoutPreview/)
    expect(checkout).toMatch(/wasMember === false/)
    expect(checkout).toMatch(/checkoutMountReady/)
    expect(confirm).toMatch(/watch\(\(\) => auth\.isMember/)
    expect(confirm).toMatch(/refreshProduct/)
    expect(confirm).toMatch(/wasMember === false/)
    expect(confirm).toMatch(/confirmMountReady/)
  })
})
