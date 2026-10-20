import { describe, expect, it } from 'vitest'
import {
  formatTrendWeekdayLabel,
  formatWearableChartValue,
  localizedRestingHrUnit
} from '../../app/utils/wearables-format'

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

describe('formatWearableChartValue', () => {
  const t = (key: string, params?: Record<string, unknown>) => {
    if (key === 'wearables.units.chartBpm') {
      return `${params?.value} bpm`
    }
    if (key === 'wearables.units.chartSteps') {
      return `${params?.value} steps`
    }
    if (key === 'wearables.units.chartSleepDuration') {
      return `${params?.hours}h ${params?.minutes}m`
    }
    if (key === 'wearables.units.chartSleepMinutes') {
      return `${params?.value} min`
    }
    return key
  }

  it('adds bpm and steps units in English', () => {
    expect(formatWearableChartValue(62, 'resting_hr', 'en', t)).toBe('62 bpm')
    expect(formatWearableChartValue(8800, 'steps', 'en', t)).toBe('8,800 steps')
  })

  it('formats sleep as hours and minutes when over an hour', () => {
    expect(formatWearableChartValue(390, 'sleep_minutes', 'en', t)).toBe('6h 30m')
  })
})

describe('localizedRestingHrUnit', () => {
  it('returns locale-specific hr unit labels', () => {
    expect(localizedRestingHrUnit('en', () => '次/分')).toBe('bpm')
    expect(localizedRestingHrUnit('zh-TW', () => '次/分')).toBe('次/分')
  })
})
