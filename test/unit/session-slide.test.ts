import { describe, expect, it } from 'vitest'
import { SESSION_SLIDE_AFTER_MS, shouldSlideSession } from '../../app/utils/session-slide'

describe('shouldSlideSession', () => {
  const issuedAt = 1_000_000
  const expiresAt = issuedAt + 86_400_000

  it('does not slide when issue time is unknown (cold load / skipHydrate)', () => {
    expect(shouldSlideSession({
      now: issuedAt + 1_000,
      issuedAt: null,
      expiresAt
    })).toBe(false)
    expect(shouldSlideSession({
      now: issuedAt + 1_000,
      issuedAt,
      expiresAt: null
    })).toBe(false)
  })

  it('slides when force is set even without timers', () => {
    expect(shouldSlideSession({
      now: issuedAt,
      issuedAt: null,
      expiresAt: null,
      force: true
    })).toBe(true)
  })

  it('does not slide a fresh token', () => {
    expect(shouldSlideSession({
      now: issuedAt + 60_000,
      issuedAt,
      expiresAt
    })).toBe(false)
  })

  it('slides after continued use', () => {
    expect(shouldSlideSession({
      now: issuedAt + SESSION_SLIDE_AFTER_MS,
      issuedAt,
      expiresAt
    })).toBe(true)
  })

  it('slides when the token is about to expire', () => {
    expect(shouldSlideSession({
      now: expiresAt - 30_000,
      issuedAt: expiresAt - 120_000,
      expiresAt
    })).toBe(true)
  })
})
