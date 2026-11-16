import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  normalizeSupportEmail,
  supportEmailLinkModel,
  supportMailtoHref
} from '../../app/utils/support-email'

describe('normalizeSupportEmail / supportMailtoHref', () => {
  it('returns trimmed email and mailto when set', () => {
    expect(normalizeSupportEmail('  candor-ai@daydream-lab.com  ')).toBe(
      'candor-ai@daydream-lab.com'
    )
    expect(supportMailtoHref('candor-ai@daydream-lab.com')).toBe(
      'mailto:candor-ai@daydream-lab.com'
    )
  })

  it('returns empty / null when unset or whitespace', () => {
    expect(normalizeSupportEmail('')).toBe('')
    expect(normalizeSupportEmail('   ')).toBe('')
    expect(normalizeSupportEmail(undefined)).toBe('')
    expect(normalizeSupportEmail(null)).toBe('')
    expect(supportMailtoHref('')).toBeNull()
    expect(supportMailtoHref('  ')).toBeNull()
  })
})

describe('supportEmailLinkModel (footer line visibility)', () => {
  it('exposes email + mailto when configured', () => {
    expect(supportEmailLinkModel('candor-ai@daydream-lab.com')).toEqual({
      email: 'candor-ai@daydream-lab.com',
      href: 'mailto:candor-ai@daydream-lab.com'
    })
  })

  it('returns null when unset so the whole line is omitted', () => {
    expect(supportEmailLinkModel('')).toBeNull()
    expect(supportEmailLinkModel('   ')).toBeNull()
    expect(supportEmailLinkModel(undefined)).toBeNull()
  })
})

describe('support email wiring (no hardcoded inbox)', () => {
  const nuxtConfig = readFileSync(resolve('nuxt.config.ts'), 'utf8')
  const defaultLayout = readFileSync(resolve('app/layouts/default.vue'), 'utf8')
  const about = readFileSync(resolve('app/pages/about.vue'), 'utf8')
  const link = readFileSync(resolve('app/components/SupportEmailLink.vue'), 'utf8')
  const zh = readFileSync(resolve('i18n/locales/zh-TW.json'), 'utf8')
  const en = readFileSync(resolve('i18n/locales/en.json'), 'utf8')
  const betaWorkflow = readFileSync(resolve('.github/workflows/github-pages.yml'), 'utf8')
  const prodWorkflow = readFileSync(resolve('.github/workflows/deploy-prod.yml'), 'utf8')

  it('exposes runtimeConfig.public.supportEmail from NUXT_PUBLIC_SUPPORT_EMAIL', () => {
    expect(nuxtConfig).toMatch(/supportEmail:\s*process\.env\.NUXT_PUBLIC_SUPPORT_EMAIL\s*\|\|\s*''/)
  })

  it('footers and about use SupportEmailLink / runtime config, not a fake address', () => {
    expect(link).toMatch(/data-testid="support-email"/)
    expect(link).toMatch(/mailtoHref/)
    expect(link).toMatch(/v-if="mailtoHref"/)
    expect(defaultLayout).toMatch(/SupportEmailLink/)
    expect(defaultLayout).not.toMatch(/footer\.email/)
    expect(defaultLayout).toMatch(/isIndex2/)
    expect(about).toMatch(/normalizeSupportEmail/)
    expect(about).toMatch(/SupportEmailLink/)
    expect(about).toMatch(/data-testid="about-contact"/)
    expect(about).not.toMatch(/service@candor\.example/)
    expect(zh).not.toMatch(/candor\.example/)
    expect(en).not.toMatch(/candor\.example/)
    expect(zh).not.toMatch(/"email":\s*"service/)
    expect(en).not.toMatch(/"email":\s*"service/)
  })

  it('beta workflow sets the inbox; prod generate omits it', () => {
    expect(betaWorkflow).toMatch(
      /NUXT_PUBLIC_SUPPORT_EMAIL:\s*candor-ai@daydream-lab\.com/
    )
    expect(prodWorkflow).not.toMatch(/NUXT_PUBLIC_SUPPORT_EMAIL/)
  })
})
