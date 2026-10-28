import { describe, expect, it } from 'vitest'
import {
  completionCtaThresholdMet,
  completionCtaVisible,
  countPathATurnPairs,
  isBasicProfileComplete,
  isRequiredBasicGapCode,
  openRequiredBasicGaps,
  pathAHardRedirectDue,
  pathASoftGuideDue,
  pathAfterCancelUploadWithoutReport,
  pathAfterReportUpload,
  pathRequiresBasicProfile,
  PATH_A_HARD_REDIRECT_TURNS,
  PATH_A_SOFT_GUIDE_TURNS
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
  it('only B／C + basic complete', () => {
    expect(completionCtaThresholdMet({ path: 'A', basicProfileComplete: true })).toBe(false)
    expect(completionCtaThresholdMet({ path: 'B', basicProfileComplete: false })).toBe(false)
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

  it('cancel upload without report demotes C→B', () => {
    expect(pathAfterCancelUploadWithoutReport('C', false)).toBe('B')
    expect(pathAfterCancelUploadWithoutReport('C', true)).toBe('C')
    expect(pathAfterCancelUploadWithoutReport('B', false)).toBe('B')
  })
})

describe('path A turn guides', () => {
  it('counts user↔assistant pairs', () => {
    expect(countPathATurnPairs([
      { role: 'assistant' },
      { role: 'user' },
      { role: 'assistant' },
      { role: 'user' },
      { role: 'assistant' }
    ])).toBe(2)
  })

  it('soft／hard thresholds', () => {
    expect(pathASoftGuideDue(PATH_A_SOFT_GUIDE_TURNS - 1)).toBe(false)
    expect(pathASoftGuideDue(PATH_A_SOFT_GUIDE_TURNS)).toBe(true)
    expect(pathAHardRedirectDue(PATH_A_HARD_REDIRECT_TURNS - 1)).toBe(false)
    expect(pathAHardRedirectDue(PATH_A_HARD_REDIRECT_TURNS)).toBe(true)
  })
})
