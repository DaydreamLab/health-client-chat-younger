import { describe, expect, it } from 'vitest'
import {
  minAiPackagePlanPrice,
  minExpertPlanPrice,
  minPositivePrice
} from '../../app/utils/recommendation-path-prices'

describe('minPositivePrice', () => {
  it('returns the lowest positive finite number', () => {
    expect(minPositivePrice([9000, 4500, 6000])).toBe(4500)
  })

  it('ignores non-positive, non-finite, and non-number values', () => {
    expect(minPositivePrice([0, -1, Number.NaN, Number.POSITIVE_INFINITY, '4500', null, 4500]))
      .toBe(4500)
  })

  it('returns null when nothing usable', () => {
    expect(minPositivePrice([])).toBeNull()
    expect(minPositivePrice([0, -3, Number.NaN])).toBeNull()
  })
})

describe('minAiPackagePlanPrice', () => {
  it('takes min price from package_plans rows', () => {
    expect(minAiPackagePlanPrice([
      { price: 9000 },
      { price: 4500 },
      { price: 6000 }
    ])).toBe(4500)
  })

  it('returns null for empty or missing lists', () => {
    expect(minAiPackagePlanPrice([])).toBeNull()
    expect(minAiPackagePlanPrice(null)).toBeNull()
    expect(minAiPackagePlanPrice(undefined)).toBeNull()
  })
})

describe('minExpertPlanPrice', () => {
  it('takes min price from expert_plans rows', () => {
    expect(minExpertPlanPrice([
      { price: 9000 },
      { price: 6000 }
    ])).toBe(6000)
  })

  it('returns null for empty or missing lists', () => {
    expect(minExpertPlanPrice([])).toBeNull()
    expect(minExpertPlanPrice(null)).toBeNull()
  })
})
