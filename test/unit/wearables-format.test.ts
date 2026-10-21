import { describe, expect, it } from 'vitest'
import en from '../../i18n/locales/en.json'
import zh from '../../i18n/locales/zh-TW.json'
import {
  formatSleepDurationMinutes,
  formatTrendWeekdayLabel,
  formatWearableChartValue,
  localizedRestingHrUnit
} from '../../app/utils/wearables-format'

type LocaleRoot = typeof en

function messageFor(dict: LocaleRoot, key: string): string {
  const path = key.replace(/^wearables\./, '').split('.')
  let node: unknown = dict.wearables
  for (const part of path) {
    node = (node as Record<string, unknown>)[part]
  }
  return node as string
}

function makeT(dict: LocaleRoot) {
  return (key: string, params?: Record<string, unknown>) => {
    let text = messageFor(dict, key)
    if (params) {
      for (const [name, value] of Object.entries(params)) {
        text = text.replace(`{${name}}`, String(value))
      }
    }
    return text
  }
}

const tEn = makeT(en)
const tZh = makeT(zh)

describe('formatTrendWeekdayLabel', () => {
  it('formats English short weekdays', () => {
    expect(formatTrendWeekdayLabel(0, 'en')).toBe('Mon')
    expect(formatTrendWeekdayLabel(6, 'en')).toBe('Sun')
  })

  it('formats zh-TW short weekdays', () => {
    const monday = formatTrendWeekdayLabel(0, 'zh-TW')
    expect(monday).toMatch(/一/)
    expect(formatTrendWeekdayLabel(6, 'zh-TW')).toMatch(/日/)
  })
})

describe('formatSleepDurationMinutes', () => {
  const cases = [
    { minutes: 420, en: '7h', zh: '7 小時' },
    { minutes: 45, en: '45m', zh: '45 分' },
    { minutes: 390, en: '6h 30m', zh: '6 小時 30 分' },
    { minutes: 0, en: '0m', zh: '0 分' },
    { minutes: 60, en: '1h', zh: '1 小時' },
    { minutes: 59, en: '59m', zh: '59 分' }
  ] as const

  it.each(cases)('formats $minutes minutes in English', ({ minutes, en: expected }) => {
    expect(formatSleepDurationMinutes(minutes, tEn)).toBe(expected)
  })

  it.each(cases)('formats $minutes minutes in zh-TW', ({ minutes, zh: expected }) => {
    expect(formatSleepDurationMinutes(minutes, tZh)).toBe(expected)
  })
})

describe('formatWearableChartValue', () => {
  it('adds bpm and steps units in English', () => {
    expect(formatWearableChartValue(62, 'resting_hr', 'en', tEn)).toBe('62 bpm')
    expect(formatWearableChartValue(8800, 'steps', 'en', tEn)).toBe('8,800 steps')
  })

  it('formats sleep with full zh duration on chart points', () => {
    expect(formatWearableChartValue(390, 'sleep_minutes', 'en', tEn)).toBe('6h 30m')
    expect(formatWearableChartValue(420, 'sleep_minutes', 'en', tEn)).toBe('7h')
    expect(formatWearableChartValue(405, 'sleep_minutes', 'zh-TW', tZh)).toBe('6 小時 45 分')
  })
})

describe('localizedRestingHrUnit', () => {
  it('returns locale-specific hr unit labels', () => {
    expect(localizedRestingHrUnit('en', () => '次/分')).toBe('bpm')
    expect(localizedRestingHrUnit('zh-TW', () => '次/分')).toBe('次/分')
  })
})
