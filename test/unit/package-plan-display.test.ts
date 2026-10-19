import { describe, expect, it } from 'vitest'
import type { PublicPackage } from '../../app/utils/candor-api'
import { resolveListPrice } from '../../app/utils/package-plan-display'

function pkg(overrides: Partial<PublicPackage> = {}): PublicPackage {
  return {
    code: 'basic',
    name: '基礎保養',
    price: 5000,
    period_days: 30,
    ...overrides
  }
}

describe('resolveListPrice', () => {
  it('returns null when original_price is missing', () => {
    expect(resolveListPrice(pkg())).toBeNull()
    expect(resolveListPrice(pkg({ original_price: null }))).toBeNull()
  })

  it('returns null when original_price equals price', () => {
    expect(resolveListPrice(pkg({ original_price: 5000, price: 5000 }))).toBeNull()
  })

  it('returns null when original_price is less than price', () => {
    expect(resolveListPrice(pkg({ original_price: 4000, price: 5000 }))).toBeNull()
  })

  it('returns original_price when it is greater than price', () => {
    expect(resolveListPrice(pkg({ original_price: 8000, price: 5000 }))).toBe(8000)
  })
})
