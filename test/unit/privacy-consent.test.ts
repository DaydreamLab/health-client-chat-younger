import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { PRIVACY_CONSENT_VERSION_KEY } from '../../app/utils/candor-api'
import {
  needsPrivacyConsent,
  readConsentedPrivacyVersion,
  writeConsentedPrivacyVersion
} from '../../app/utils/privacy-consent'

describe('needsPrivacyConsent', () => {
  it('needs consent when nothing stored', () => {
    expect(needsPrivacyConsent('2026-10-24', null)).toBe(true)
  })

  it('does not need consent when versions match', () => {
    expect(needsPrivacyConsent('2026-10-24', '2026-10-24')).toBe(false)
  })

  it('needs consent when policy version changes', () => {
    expect(needsPrivacyConsent('2026-11-01', '2026-10-24')).toBe(true)
  })

  it('does not prompt when current version is missing', () => {
    expect(needsPrivacyConsent(null, null)).toBe(false)
    expect(needsPrivacyConsent('  ', '2026-10-24')).toBe(false)
  })
})

describe('privacy consent localStorage', () => {
  const memory = new Map<string, string>()

  beforeEach(() => {
    memory.clear()
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => memory.get(key) ?? null,
      setItem: (key: string, value: string) => {
        memory.set(key, value)
      },
      removeItem: (key: string) => {
        memory.delete(key)
      },
      clear: () => {
        memory.clear()
      }
    })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('round-trips consented version', () => {
    expect(readConsentedPrivacyVersion()).toBeNull()
    writeConsentedPrivacyVersion('2026-10-24')
    expect(memory.get(PRIVACY_CONSENT_VERSION_KEY)).toBe('2026-10-24')
    expect(readConsentedPrivacyVersion()).toBe('2026-10-24')
  })

  it('trims version before write and read', () => {
    writeConsentedPrivacyVersion('  v2  ')
    expect(readConsentedPrivacyVersion()).toBe('v2')
  })
})
