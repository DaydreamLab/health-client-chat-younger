import { describe, expect, it } from 'vitest'
import type { HealthReportResult } from '../../app/utils/candor-api'
import { resultGaugePct, resultScale } from '../../app/utils/report-result-status'

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
    expect(scale?.bands[0]?.toPct).toBeCloseTo(25)
    expect(scale?.bands[1]?.fromPct).toBeCloseTo(25)
    expect(scale?.bands[1]?.toPct).toBeCloseTo(75)
    expect(scale?.bands[2]?.fromPct).toBeCloseTo(75)
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
    expect(inside?.min).toBeCloseTo(35)
    expect(inside?.max).toBeCloseTo(95)

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
