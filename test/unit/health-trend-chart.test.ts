import { describe, expect, it } from 'vitest'
import { healthTrend } from '../../app/utils/health-demo'
import {
  assertTrendLineMatchesPoints,
  parseTrendLinePath,
  HEALTH_TREND_CHART_WIDTH,
  plotHealthTrend,
  plotHealthTrendWithValueLabels
} from '../../app/utils/health-trend-chart'
import { formatWearableChartValue } from '../../app/utils/wearables-format'

describe('plotHealthTrend', () => {
  it('plots default health demo trend with four points', () => {
    const points = [...healthTrend]
    const chart = plotHealthTrend(points)
    expect(chart.plotted).toHaveLength(4)
    expect(chart.plotted[0]?.key).toBe('may')
    expect(chart.plotted.at(-1)?.value).toBe(84)
    expect(chart.linePoints).toMatch(/^\d+(\.\d+)?,\d+(\.\d+)?( \d+(\.\d+)?,\d+(\.\d+)?){3}$/)
    expect(chart.areaPath.startsWith('M ')).toBe(true)
    expect(chart.linePath.startsWith('M ')).toBe(true)
    expect(chart.pathLength).toBeGreaterThan(0)
    assertTrendLineMatchesPoints(parseTrendLinePath(chart.linePath), chart.plotted)
    expect(chart.padTop).toBeGreaterThanOrEqual(52)
  })

  it('builds a complete line path on wide zh steps chart', () => {
    const trend = [
      { key: 'd1', value: 6200, weekdayIndex: 0 },
      { key: 'd2', value: 9100, weekdayIndex: 1 },
      { key: 'd3', value: 7800, weekdayIndex: 2 },
      { key: 'd4', value: 8400, weekdayIndex: 3 },
      { key: 'd5', value: 7200, weekdayIndex: 4 },
      { key: 'd6', value: 10200, weekdayIndex: 5 },
      { key: 'd7', value: 8800, weekdayIndex: 6 }
    ]
    const texts = trend.map(point => formatWearableChartValue(point.value, 'steps', 'zh-TW', (key, params) => {
      if (key === 'wearables.units.chartSteps') {
        return `${params?.value} 步`
      }
      return key
    }))
    const { chart } = plotHealthTrendWithValueLabels(trend, texts, 'zh-TW', 'steps')
    expect(chart.pathLength).toBeGreaterThan(500)
    expect(chart.width).toBeGreaterThan(HEALTH_TREND_CHART_WIDTH)
    assertTrendLineMatchesPoints(parseTrendLinePath(chart.linePath), chart.plotted)
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
