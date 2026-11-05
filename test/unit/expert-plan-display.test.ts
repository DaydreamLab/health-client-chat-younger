import { describe, expect, it } from 'vitest'
import type { ExpertPlan } from '../../app/utils/candor-api'
import {
  resolveExpertPlanTitle,
  resolveIncludedPackagePlanName
} from '../../app/utils/expert-plan-display'

function plan(overrides: Partial<ExpertPlan> = {}): ExpertPlan {
  return {
    id: 'ep-1',
    code: 'basic',
    package_plan_id: 'pp-basic',
    name_zh: '專家方案（基礎保養）',
    price: 6000,
    ...overrides
  }
}

describe('resolveExpertPlanTitle', () => {
  it('uses name_zh for zh locale', () => {
    expect(resolveExpertPlanTitle(plan({
      name_en: 'Expert plan (Basic care)'
    }), 'zh-TW')).toBe('專家方案（基礎保養）')
  })

  it('prefers name_en for en locale, then name_zh', () => {
    expect(resolveExpertPlanTitle(plan({
      name_en: 'Expert plan (Basic care)'
    }), 'en')).toBe('Expert plan (Basic care)')
    expect(resolveExpertPlanTitle(plan({
      name_en: '  '
    }), 'en')).toBe('專家方案（基礎保養）')
    expect(resolveExpertPlanTitle(plan({
      name_en: null
    }), 'en')).toBe('專家方案（基礎保養）')
  })
})

describe('resolveIncludedPackagePlanName', () => {
  it('returns null when all fields are missing (legacy API)', () => {
    expect(resolveIncludedPackagePlanName(plan(), 'zh-TW')).toBeNull()
    expect(resolveIncludedPackagePlanName(plan(), 'en')).toBeNull()
    expect(resolveIncludedPackagePlanName(plan({
      package_plan_name_zh: null,
      package_plan_name_en: null,
      package_plan_code: null
    }), 'en')).toBeNull()
  })

  it('zh prefers package_plan_name_zh then en then code', () => {
    expect(resolveIncludedPackagePlanName(plan({
      package_plan_name_zh: '基礎保養',
      package_plan_name_en: 'Basic care',
      package_plan_code: 'basic'
    }), 'zh-TW')).toBe('基礎保養')
    expect(resolveIncludedPackagePlanName(plan({
      package_plan_name_zh: '  ',
      package_plan_name_en: 'Basic care'
    }), 'zh-TW')).toBe('Basic care')
    expect(resolveIncludedPackagePlanName(plan({
      package_plan_code: 'basic'
    }), 'zh-TW')).toBe('basic')
  })

  it('en prefers package_plan_name_en then zh then code', () => {
    expect(resolveIncludedPackagePlanName(plan({
      package_plan_name_zh: '基礎保養',
      package_plan_name_en: 'Basic care',
      package_plan_code: 'basic'
    }), 'en')).toBe('Basic care')
    expect(resolveIncludedPackagePlanName(plan({
      package_plan_name_zh: '基礎保養',
      package_plan_name_en: null
    }), 'en')).toBe('基礎保養')
    expect(resolveIncludedPackagePlanName(plan({
      package_plan_code: 'basic'
    }), 'en')).toBe('basic')
  })
})
