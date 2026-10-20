import { describe, expect, it } from 'vitest'
import { healthTrend } from '../../app/utils/health-demo'
import { plotHealthTrend } from '../../app/utils/health-trend-chart'

describe('plotHealthTrend', () => {
  it('plots default health demo trend with four points', () => {
    const points = [...healthTrend]
    const chart = plotHealthTrend(points)
    expect(chart.plotted).toHaveLength(4)
    expect(chart.plotted[0]?.key).toBe('may')
    expect(chart.plotted.at(-1)?.value).toBe(84)
    expect(chart.linePoints).toMatch(/^\d+(\.\d+)?,\d+(\.\d+)?( \d+(\.\d+)?,\d+(\.\d+)?){3}$/)
    expect(chart.areaPath.startsWith('M ')).toBe(true)
    expect(chart.padTop).toBeGreaterThanOrEqual(52)
  })

  it('accepts weekdayIndex and custom labels without changing point count', () => {
    const points = [
      { key: 'd1', value: 60, weekdayIndex: 0 },
      { key: 'd2', value: 65, label: '2' }
    ]
    const chart = plotHealthTrend(points)
    expect(chart.plotted).toHaveLength(2)
    expect(chart.plotted[0]?.weekdayIndex).toBe(0)
    expect(chart.plotted[1]?.label).toBe('2')
  })
})
