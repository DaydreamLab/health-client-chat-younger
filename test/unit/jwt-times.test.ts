import { describe, expect, it } from 'vitest'
import { readJwtTimes } from '../../app/utils/jwt-times'

function fakeJwt(payload: Record<string, unknown>) {
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url')
  return `hdr.${body}.sig`
}

describe('readJwtTimes', () => {
  it('reads iat/exp as millisecond timestamps', () => {
    const times = readJwtTimes(fakeJwt({ iat: 1_700_000_000, exp: 1_700_086_400 }))
    expect(times).toEqual({
      issuedAt: 1_700_000_000_000,
      expiresAt: 1_700_086_400_000
    })
  })

  it('returns null for malformed tokens', () => {
    expect(readJwtTimes('not-a-jwt')).toBeNull()
    expect(readJwtTimes(fakeJwt({ sub: 'x' }))).toBeNull()
  })
})
