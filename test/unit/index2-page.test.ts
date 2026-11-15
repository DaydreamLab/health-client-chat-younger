import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

describe('/index2 homepage v2 contract', () => {
  const page = readFileSync(resolve('app/pages/index2.vue'), 'utf8')
  const layout = readFileSync(resolve('app/layouts/index2.vue'), 'utf8')
  const home = readFileSync(resolve('app/pages/index.vue'), 'utf8')
  const defaultLayout = readFileSync(resolve('app/layouts/default.vue'), 'utf8')
  const zh = readFileSync(resolve('i18n/locales/zh-TW.json'), 'utf8')
  const en = readFileSync(resolve('i18n/locales/en.json'), 'utf8')
  const nuxtConfig = readFileSync(resolve('nuxt.config.ts'), 'utf8')

  it('exists as a sibling of the current homepage without changing index.vue', () => {
    expect(existsSync(resolve('app/pages/index2.vue'))).toBe(true)
    expect(existsSync(resolve('app/layouts/index2.vue'))).toBe(true)
    expect(home).toMatch(/data-testid="home-goals"/)
    expect(home).toMatch(/你想先改善哪裡|homeGoals\.title/)
    expect(defaultLayout).toMatch(/SupportEmailLink/)
  })

  it('books Younger advisor via /expert-booking and omits goals section', () => {
    expect(page).toMatch(/['"]data-testid['"]:\s*['"]package-advisor-booking['"]/)
    expect(page).toMatch(/localePath\('\/expert-booking'\)/)
    expect(page).not.toMatch(/home-goals/)
    expect(page).not.toMatch(/homeGoals/)
    expect(page).not.toMatch(/你想先改善哪裡/)
    expect(zh).toMatch(/"advisorCta": "預約 Younger 顧問"/)
    expect(en).toMatch(/"advisorCta": "Book a Younger advisor"/)
  })

  it('sets noindex and a SEO description without specialist-handoff wording', () => {
    expect(page).toMatch(/robots:\s*['"]noindex,\s*nofollow['"]/)
    expect(page).toMatch(/homeV2\.meta\.description/)
    expect(zh).toMatch(/取得專屬保健品組合/)
    expect(zh).not.toMatch(/homeV2[\s\S]*轉專人客服/)
    expect(en).not.toMatch(/homeV2[\s\S]*specialist when you need one/)
  })

  it('uses an index2-only footer with optional support email and without social icons', () => {
    expect(page).toMatch(/layout:\s*['"]index2['"]/)
    expect(layout).toMatch(/data-testid="index2-footer"/)
    expect(layout).toMatch(/SupportEmailLink/)
    expect(layout).toMatch(/showSupportEmail/)
    expect(layout).not.toMatch(/socialInstagram|socialFacebook|socialLine/)
    expect(layout).toMatch(/footer-explore-plans/)
    expect(layout).toMatch(/footer-support-orders/)
    expect(defaultLayout).toMatch(/SupportEmailLink/)
    expect(defaultLayout).toMatch(/socialInstagram/)
  })

  it('shows a 30-day billing cycle and keeps plan cards aligned without extra description', () => {
    expect(zh).toMatch(/"billingCycle": "／30 天份"/)
    expect(en).toMatch(/"billingCycle": "\/ 30-day set"/)
    expect(zh).not.toMatch(/homeV2[\s\S]*月付/)
    expect(page).toMatch(/priceWrapper:\s*'flex flex-wrap items-baseline gap-1'/)
    expect(page).toMatch(/billing:\s*'order-2 shrink-0'/)
    expect(page).toMatch(/billingCycle:\s*'text-muted text-xs font-medium whitespace-nowrap'/)
    expect(page).not.toMatch(/description:\s*t\('homeV2\.plans\.advisorDescription'\)/)
  })

  it('prerenders /index2 and /en/index2', () => {
    expect(nuxtConfig).toMatch(/'\/index2'/)
    expect(nuxtConfig).toMatch(/'\/en\/index2'/)
  })
})
