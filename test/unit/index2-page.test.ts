import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

describe('/index2 homepage contract (original home copy)', () => {
  const page = readFileSync(resolve('app/pages/index2.vue'), 'utf8')
  const home = readFileSync(resolve('app/pages/index.vue'), 'utf8')
  const defaultLayout = readFileSync(resolve('app/layouts/default.vue'), 'utf8')
  const zh = readFileSync(resolve('i18n/locales/zh-TW.json'), 'utf8')
  const en = readFileSync(resolve('i18n/locales/en.json'), 'utf8')
  const nuxtConfig = readFileSync(resolve('nuxt.config.ts'), 'utf8')

  it('exists as a sibling of the current homepage without changing index.vue goals', () => {
    expect(existsSync(resolve('app/pages/index2.vue'))).toBe(true)
    expect(existsSync(resolve('app/layouts/index2.vue'))).toBe(false)
    expect(home).toMatch(/data-testid="home-goals"/)
    expect(home).toMatch(/homeGoals\.title/)
    expect(defaultLayout).toMatch(/SupportEmailLink/)
  })

  it('uses original home i18n keys and omits goals / labs / reviews / expert-booking', () => {
    expect(page).toMatch(/\$t\('hero\.eyebrow'\)/)
    expect(page).toMatch(/\$t\('plans\.offerName'\)/)
    expect(page).toMatch(/\$t\('reviews\.ctaEarlyBird'\)/)
    expect(page).not.toMatch(/homeV2/)
    expect(page).not.toMatch(/home-goals/)
    expect(page).not.toMatch(/homeGoals/)
    expect(page).not.toMatch(/hero-cta-labs/)
    expect(page).not.toMatch(/hero-cta-younger-labs/)
    expect(page).not.toMatch(/home-younger-labs/)
    expect(page).not.toMatch(/showHomeReviews/)
    expect(page).not.toMatch(/expert-booking/)
    expect(page).not.toMatch(/package-advisor-booking/)
    expect(zh).not.toMatch(/"homeV2"/)
    expect(en).not.toMatch(/"homeV2"/)
  })

  it('sets noindex and reuses the original meta description', () => {
    expect(page).toMatch(/robots:\s*['"]noindex,\s*nofollow['"]/)
    expect(page).toMatch(/t\('meta\.description'\)/)
  })

  it('uses the default layout with an index2-aware footer (no social icons)', () => {
    expect(page).not.toMatch(/layout:\s*['"]index2['"]/)
    expect(defaultLayout).toMatch(/index2-footer/)
    expect(defaultLayout).toMatch(/footer-explore-plans/)
    expect(defaultLayout).toMatch(/footer-support-orders/)
    expect(defaultLayout).toMatch(/isIndex2/)
    expect(defaultLayout).toMatch(/SupportEmailLink/)
    expect(defaultLayout).toMatch(/socialInstagram/)
  })

  it('anchors plans hash links to /index2', () => {
    expect(page).toMatch(/localePath\('\/index2'\)/)
    expect(page).toMatch(/#plans/)
    expect(defaultLayout).toMatch(/localePath\('\/index2'\)/)
  })

  it('prerenders /index2 and /en/index2', () => {
    expect(nuxtConfig).toMatch(/'\/index2'/)
    expect(nuxtConfig).toMatch(/'\/en\/index2'/)
  })
})
