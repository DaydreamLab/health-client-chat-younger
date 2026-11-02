import { describe, expect, it } from 'vitest'
import {
  completionCtaThresholdMet,
  completionCtaVisible,
  isBasicProfileComplete,
  isRequiredBasicGapCode,
  normalizeConversationPath,
  openRequiredBasicGaps,
  pathAfterCancelUploadWithoutReport,
  pathAfterReportUpload,
  pathRequiresBasicProfile,
  resolvePathAfterContinueConsult,
  shouldOpenGoalsFromCachedOptions,
  toApiConversationPath
} from '../../app/utils/path-contract'

describe('isBasicProfileComplete', () => {
  it('true when no open gaps', () => {
    expect(isBasicProfileComplete([])).toBe(true)
    expect(isBasicProfileComplete(null)).toBe(true)
  })

  it('false while any of sex／age／height／weight open', () => {
    expect(isBasicProfileComplete(['sex'])).toBe(false)
    expect(isBasicProfileComplete(['age'])).toBe(false)
    expect(isBasicProfileComplete(['height', 'diet'])).toBe(false)
    expect(isBasicProfileComplete(['weight'])).toBe(false)
  })

  it('ignores optional gaps (diet) — 舊 triad 全清 profile 拿掉', () => {
    expect(isBasicProfileComplete(['diet', 'allergies'])).toBe(true)
  })

  it('treats age_years as age', () => {
    expect(isBasicProfileComplete(['age_years'])).toBe(false)
    expect(isBasicProfileComplete(['age_years', 'sex', 'height', 'weight'])).toBe(false)
  })
})

describe('openRequiredBasicGaps / isRequiredBasicGapCode', () => {
  it('filters to required four only', () => {
    expect(openRequiredBasicGaps(['sex', 'diet', 'height'])).toEqual(['sex', 'height'])
    expect(isRequiredBasicGapCode('diet')).toBe(false)
    expect(isRequiredBasicGapCode('age_years')).toBe(true)
  })
})

describe('completion CTA threshold (no FE 硬保)', () => {
  it('only path B／C (completion_cta_ready on core)', () => {
    expect(completionCtaThresholdMet({ path: 'A', basicProfileComplete: true })).toBe(false)
    expect(completionCtaThresholdMet({ path: 'B', basicProfileComplete: false })).toBe(true)
    expect(completionCtaThresholdMet({ path: 'B', basicProfileComplete: true })).toBe(true)
    expect(completionCtaThresholdMet({ path: 'C', basicProfileComplete: true })).toBe(true)
    expect(completionCtaThresholdMet({ path: null, basicProfileComplete: true })).toBe(false)
  })

  it('journey allows when required ask not active; goals／report not in this gate', () => {
    expect(completionCtaVisible({
      path: 'B',
      basicProfileComplete: true,
      readonlyMode: false,
      escalated: false,
      isLatestAssistant: true,
      reportRetry: false,
      requiredProfileQuestionActive: false
    })).toBe(true)
    expect(completionCtaVisible({
      path: 'B',
      basicProfileComplete: true,
      readonlyMode: false,
      escalated: false,
      isLatestAssistant: true,
      reportRetry: false,
      requiredProfileQuestionActive: true
    })).toBe(false)
  })
})

describe('pathRequiresBasicProfile', () => {
  it('B／C yes, A／null no', () => {
    expect(pathRequiresBasicProfile('B')).toBe(true)
    expect(pathRequiresBasicProfile('C')).toBe(true)
    expect(pathRequiresBasicProfile('A')).toBe(false)
    expect(pathRequiresBasicProfile(null)).toBe(false)
  })
})

describe('path transitions', () => {
  it('upload always promotes to C', () => {
    expect(pathAfterReportUpload('A')).toBe('C')
    expect(pathAfterReportUpload('B')).toBe('C')
    expect(pathAfterReportUpload(null)).toBe('C')
  })

  it('path switch from C uses POST …/path (no auto demote helper)', () => {
    expect(pathAfterCancelUploadWithoutReport('C', false)).toBe(null)
    expect(pathAfterCancelUploadWithoutReport('C', true)).toBe(null)
    expect(pathAfterCancelUploadWithoutReport('B', false)).toBe(null)
  })
})

describe('normalizeConversationPath / toApiConversationPath', () => {
  it('accepts core lowercase and FE uppercase', () => {
    expect(normalizeConversationPath('a')).toBe('A')
    expect(normalizeConversationPath('B')).toBe('B')
    expect(normalizeConversationPath('c')).toBe('C')
    expect(normalizeConversationPath('x')).toBe(null)
    expect(normalizeConversationPath(null)).toBe(null)
  })

  it('wires FE path to API lowercase', () => {
    expect(toApiConversationPath('A')).toBe('a')
    expect(toApiConversationPath('B')).toBe('b')
    expect(toApiConversationPath('C')).toBe('c')
  })
})

describe('resolvePathAfterContinueConsult — A→B continue-health sync', () => {
  const continueLabel = '繼續健康諮詢'

  it('A + continue label → prefers stream path', () => {
    expect(resolvePathAfterContinueConsult({
      pathBefore: 'A',
      continueLabel,
      sentContent: continueLabel,
      pathFromStream: 'b',
      pathFromRefetch: 'c'
    })).toBe('B')
  })

  it('A + continue label → uses refetch path when stream omits path', () => {
    expect(resolvePathAfterContinueConsult({
      pathBefore: 'A',
      continueLabel,
      sentContent: ` ${continueLabel} `,
      pathFromStream: null,
      pathFromRefetch: 'B'
    })).toBe('B')
  })

  it('A + continue label → optimistic B when core omits path everywhere', () => {
    expect(resolvePathAfterContinueConsult({
      pathBefore: 'A',
      continueLabel,
      sentContent: continueLabel
    })).toBe('B')
  })

  it('B／C／null or non-continue content → no-op (null)', () => {
    expect(resolvePathAfterContinueConsult({
      pathBefore: 'B',
      continueLabel,
      sentContent: continueLabel,
      pathFromStream: 'b'
    })).toBe(null)
    expect(resolvePathAfterContinueConsult({
      pathBefore: 'C',
      continueLabel,
      sentContent: continueLabel
    })).toBe(null)
    expect(resolvePathAfterContinueConsult({
      pathBefore: null,
      continueLabel,
      sentContent: continueLabel
    })).toBe(null)
    expect(resolvePathAfterContinueConsult({
      pathBefore: 'A',
      continueLabel,
      sentContent: '聊聊別的'
    })).toBe(null)
  })
})

describe('shouldOpenGoalsFromCachedOptions — A→B guide_switch', () => {
  it('guide_switch never force-opens from cached chips (goals may already be answered)', () => {
    expect(shouldOpenGoalsFromCachedOptions({
      reason: 'guide_switch',
      goalOptionsCount: 5
    })).toBe(false)
    expect(shouldOpenGoalsFromCachedOptions({
      reason: 'guide_switch',
      goalOptionsCount: 0
    })).toBe(false)
  })

  it('non-guide still opens when ≥2 cached options (goals not yet answered path)', () => {
    expect(shouldOpenGoalsFromCachedOptions({
      reason: 'entry',
      goalOptionsCount: 2
    })).toBe(true)
    expect(shouldOpenGoalsFromCachedOptions({
      reason: 'upload_promote',
      goalOptionsCount: 5
    })).toBe(true)
    expect(shouldOpenGoalsFromCachedOptions({
      reason: 'entry',
      goalOptionsCount: 1
    })).toBe(false)
  })
})
