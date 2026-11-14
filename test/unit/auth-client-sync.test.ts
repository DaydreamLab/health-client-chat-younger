import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

describe('auth client sync after prerender', () => {
  it('skips hydrating auth store from generate-time guest snapshot', () => {
    const source = readFileSync(resolve('app/stores/auth.ts'), 'utf8')
    expect(source).toMatch(/skipHydrate\(ref/)
    expect(source).toMatch(/never mint guest over an existing token/i)
  })

  it('keeps auth-session plugin non-blocking for SPA shells', () => {
    const source = readFileSync(
      resolve('app/plugins/auth-session.client.ts'),
      'utf8'
    )
    expect(source).toMatch(/void auth\.ensureSession/)
    expect(source).not.toMatch(/await auth\.ensureSession/)
  })

  it('exposes useAuthClientSync for post-mount member gates', () => {
    const source = readFileSync(
      resolve('app/composables/useAuthClientSync.ts'),
      'utf8'
    )
    expect(source).toMatch(/memberGateLocked/)
    expect(source).toMatch(/ensureSession/)
  })
})
