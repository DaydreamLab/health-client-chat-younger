import { describe, expect, it } from 'vitest'
import { healthTrend } from '../../app/utils/health-demo'
import {
  assertTrendLineMatchesPoints,
  parseTrendLinePath,
  HEALTH_TREND_CHART_WIDTH,
  HEALTH_TREND_POINT_AXIS_CLEARANCE,
  HEALTH_TREND_POINT_RADIUS,
  plotHealthTrend,
  plotHealthTrendWithValueLabels,
  shouldShowTrendAxisLabel
} from '../../app/utils/health-trend-chart'
import { formatWearableChartValue } from '../../app/utils/wearables-format'
import { getWearableMetricSummary } from '../../app/utils/wearables-mock'

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

  it('keeps lowest steps points above the X-axis label band', () => {
    const trend = getWearableMetricSummary('oura-ring', 'steps', 7)!.trend
    const texts = trend.map(point => formatWearableChartValue(point.value, 'steps', 'en', (key, params) => {
      if (key === 'wearables.units.chartSteps') {
        return `${params?.value} steps`
      }
      return key
    }))
    const { chart } = plotHealthTrendWithValueLabels(trend, texts, 'en', 'steps')
    const labelTop = chart.height - chart.padBottom + 16 - 11
    for (const point of chart.plotted) {
      expect(point.y + HEALTH_TREND_POINT_RADIUS).toBeLessThanOrEqual(labelTop - 1)
    }
    expect(HEALTH_TREND_POINT_AXIS_CLEARANCE).toBeGreaterThan(HEALTH_TREND_POINT_RADIUS)
  })
})

describe('shouldShowTrendAxisLabel', () => {
  it('shows every label for a 7-day series', () => {
    for (let index = 0; index < 7; index++) {
      expect(shouldShowTrendAxisLabel(index, 7)).toBe(true)
    }
  })

  it('thins 30-day labels to interval ticks plus ends', () => {
    const visible = Array.from({ length: 30 }, (_, index) => index)
      .filter(index => shouldShowTrendAxisLabel(index, 30))
      .map(index => index + 1)
    expect(visible).toEqual([1, 5, 10, 15, 20, 25, 30])
  })
})
