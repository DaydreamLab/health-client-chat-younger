import { describe, expect, it } from 'vitest'
import type { PublicPackage } from '../../app/utils/candor-api'
import { resolvePlanDescription } from '../../app/utils/package-plan-display'

const t = (key: string) => {
  const map: Record<string, string> = {
    'plans.basicDescription': 'EN basic subtitle',
    'plans.advanceDescription': 'EN advance subtitle'
  }
  return map[key] ?? key
}

describe('resolvePlanDescription', () => {
  const base: PublicPackage = {
    code: 'basic',
    name: '基礎保養',
    price: 5000,
    period_days: 30,
    description: '對應異常指標的基礎補充'
  }

  it('uses description_en on English locale when present', () => {
    expect(resolvePlanDescription({
      ...base,
      description_en: 'From API EN'
    }, 'en', t)).toBe('From API EN')
  })

  it('falls back to i18n on English locale without description_en', () => {
    expect(resolvePlanDescription(base, 'en', t)).toBe('EN basic subtitle')
  })

  it('does not expose Chinese description on English locale', () => {
    expect(resolvePlanDescription(base, 'en', t)).not.toContain('對應')
  })
})
