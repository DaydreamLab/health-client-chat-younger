import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const gatedPages = [
  'app/pages/app/orders/index.vue',
  'app/pages/app/orders/[id].vue',
  'app/pages/app/me.vue',
  'app/pages/app/notifications.vue',
  'app/pages/expert-booking/index.vue',
  'app/pages/expert-booking/confirm.vue'
] as const

describe('member auth shell on gated pages', () => {
  for (const page of gatedPages) {
    it(`${page} uses MemberAuthShell skeleton before gate`, () => {
      const source = readFileSync(resolve(page), 'utf8')
      expect(source).toMatch(/MemberAuthShell/)
      expect(source).toMatch(/skeleton-test-id=/)
      // Must not show AuthGate while pending via old memberGateLocked pattern.
      expect(source).not.toMatch(/v-if="gateLocked"/)
      expect(source).not.toMatch(/memberGateLocked:\s*gateLocked/)
    })
  }

  it('checkout waits for settled before guest gate or form', () => {
    const source = readFileSync(resolve('app/pages/app/checkout.vue'), 'utf8')
    expect(source).toMatch(/checkout-auth-skeleton/)
    expect(source).toMatch(/!settled/)
    expect(source).toMatch(/useAuthClientSync/)
    expect(source).not.toMatch(/auth\.ready\s*&&\s*!auth\.isMember/)
  })
})
