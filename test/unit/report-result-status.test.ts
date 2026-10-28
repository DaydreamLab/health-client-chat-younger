import { describe, expect, it } from 'vitest'
import type { HealthReportResult } from '../../app/utils/candor-api'
import {
  displayResultName,
  displayResultOriginalName,
  hasResultInterpretation,
  resultGaugePct,
  resultScale,
  resultStatusClass
} from '../../app/utils/report-result-status'

function row(partial: Partial<HealthReportResult>): HealthReportResult {
  return {
    id: 'result-1',
    ...partial
  }
}

describe('resultScale', () => {
  it('draws warn, optimal, and warn bands from the reference interval', () => {
    const scale = resultScale(row({
      ref_low: 50,
      ref_high: 80,
      value_numeric: 65
    }))

    expect(scale).not.toBeNull()
    expect(scale?.valuePct).toBeCloseTo(50)
    expect(scale?.bands.map(band => band.status)).toEqual(['warn', 'ok', 'warn'])
    // GAUGE_PAD_RATIO=1.5 → ref is 37.5%–62.5% of the bar
    expect(scale?.bands[0]?.toPct).toBeCloseTo(37.5)
    expect(scale?.bands[1]?.fromPct).toBeCloseTo(37.5)
    expect(scale?.bands[1]?.toPct).toBeCloseTo(62.5)
    expect(scale?.bands[2]?.fromPct).toBeCloseTo(62.5)
  })

  it('adds alert bands outside critical limits', () => {
    const scale = resultScale(row({
      ref_low: 50,
      ref_high: 80,
      critical_low: 30,
      critical_high: 110,
      value_numeric: 31.8
    }))

    expect(scale?.bands.map(band => band.status)).toEqual([
      'alert',
      'warn',
      'ok',
      'warn',
      'alert'
    ])
    expect(scale?.min).toBeLessThan(30)
    expect(scale?.max).toBeGreaterThan(110)
    expect(scale?.valuePct).toBeGreaterThan(0)
    expect(scale?.valuePct).toBeLessThan(scale?.bands[1]?.toPct ?? 0)
  })

  it('keeps borderline values inside the caution band', () => {
    const inside = resultScale(row({
      ref_low: 50,
      ref_high: 80,
      borderline_low: 40,
      borderline_high: 90,
      value_numeric: 65
    }))
    expect(inside?.bands.map(band => band.status)).toEqual(['warn', 'ok', 'warn'])
    // span=30, pad=45 → min=5, max=125 (borderline 40–90 still inside)
    expect(inside?.min).toBeCloseTo(5)
    expect(inside?.max).toBeCloseTo(125)

    const outside = resultScale(row({
      ref_low: 50,
      ref_high: 80,
      borderline_low: 20,
      borderline_high: 100,
      value_numeric: 65
    }))
    expect(outside?.bands.map(band => band.status)).toEqual(['warn', 'ok', 'warn'])
    expect(outside?.min).toBeLessThan(20)
    expect(outside?.max).toBeGreaterThan(100)
  })

  it('returns no scale without a closed reference interval', () => {
    expect(resultScale(row({ value_numeric: 10 }))).toBeNull()
    expect(resultScale(row({ ref_low: 10, value_numeric: 12 }))).toBeNull()
    expect(resultScale(row({ ref_low: 80, ref_high: 50 }))).toBeNull()
  })

  it('omits the marker when the value is not numeric', () => {
    const scale = resultScale(row({
      ref_low: 50,
      ref_high: 80,
      raw_value: '未提供'
    }))
    expect(scale?.valuePct).toBeNull()
    expect(scale?.bands).toHaveLength(3)
  })

  it('leaves the table gauge on the reference padding', () => {
    expect(resultGaugePct(row({
      ref_low: 50,
      ref_high: 80,
      value_numeric: 65,
      critical_low: 30,
      critical_high: 110
    }))).toBeCloseTo(50)
  })
})

describe('resultStatusClass', () => {
  it('keeps ALT-like in-range values optimal even when borderline_low equals ref_high', () => {
    expect(resultStatusClass(row({
      value_numeric: 39,
      ref_low: 0,
      ref_high: 41,
      borderline_low: 41,
      borderline_high: 80,
      critical_high: 200
    }))).toBe('ok')
  })

  it('flags only outside ref as warn; critical thresholds as alert', () => {
    expect(resultStatusClass(row({
      value_numeric: 50,
      ref_low: 0,
      ref_high: 41,
      borderline_low: 41,
      borderline_high: 80
    }))).toBe('warn')
    expect(resultStatusClass(row({
      value_numeric: 210,
      ref_low: 0,
      ref_high: 41,
      critical_high: 200
    }))).toBe('alert')
  })
})

describe('displayResultName', () => {
  it('prefers name_zh over raw_name', () => {
    expect(displayResultName(row({
      name_zh: '低密度脂蛋白',
      raw_name: 'LDL'
    }))).toBe('低密度脂蛋白')
  })

  it('falls back to raw_name then biomarker_id', () => {
    expect(displayResultName(row({ raw_name: 'LDL' }))).toBe('LDL')
    expect(displayResultName(row({ biomarker_id: 'bio-1' }))).toBe('bio-1')
    expect(displayResultName(row({}))).toBe('—')
  })
})

describe('displayResultOriginalName', () => {
  it('returns raw_name when it differs from display name', () => {
    expect(displayResultOriginalName(row({
      name_zh: '低密度脂蛋白',
      raw_name: 'LDL'
    }))).toBe('LDL')
  })

  it('returns null when raw_name matches display name or is empty', () => {
    expect(displayResultOriginalName(row({
      name_zh: 'LDL',
      raw_name: 'LDL'
    }))).toBeNull()
    expect(displayResultOriginalName(row({ name_zh: '低密度脂蛋白' }))).toBeNull()
  })
})

describe('hasResultInterpretation', () => {
  it('is true when description, possible_causes, or possible_risks is non-empty', () => {
    expect(hasResultInterpretation(row({ description: '說明' }))).toBe(true)
    expect(hasResultInterpretation(row({ possible_causes: '原因' }))).toBe(true)
    expect(hasResultInterpretation(row({ possible_risks: '風險' }))).toBe(true)
    expect(hasResultInterpretation(row({ description: '  ', possible_causes: '', possible_risks: '' }))).toBe(false)
  })
})
