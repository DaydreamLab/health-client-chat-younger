import { describe, expect, it } from 'vitest'
import en from '../../i18n/locales/en.json'
import zh from '../../i18n/locales/zh-TW.json'
import {
  assertTrendValueLabelsClear,
  plotHealthTrendWithValueLabels,
  segmentIntersectsRect,
  trendLabelCollidesWithGeometry
} from '../../app/utils/health-trend-chart'
import { formatWearableChartValue } from '../../app/utils/wearables-format'
import { getWearableMetricSummary } from '../../app/utils/wearables-mock'
import type { WearableMetricType } from '../../app/utils/wearables-mock'

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

const metrics: WearableMetricType[] = ['resting_hr', 'steps', 'sleep_minutes']

describe('segmentIntersectsRect', () => {
  it('detects line through label box', () => {
    const rect = { left: 40, right: 80, top: 40, bottom: 55 }
    expect(segmentIntersectsRect(10, 48, 100, 48, 3, rect)).toBe(true)
    expect(segmentIntersectsRect(10, 10, 100, 10, 3, rect)).toBe(false)
  })
})

describe('plotHealthTrendWithValueLabels', () => {
  for (const metric of metrics) {
    it(`lays out 7-day ${metric} in English without label overlap or geometry hits`, () => {
      const trend = getWearableMetricSummary('apple-watch', metric, 7)!.trend
      const texts = trend.map(point =>
        formatWearableChartValue(point.value, metric, 'en', tEn)
      )
      const { chart, valueLabels } = plotHealthTrendWithValueLabels(trend, texts, 'en', metric)
      expect(valueLabels).toHaveLength(7)
      assertTrendValueLabelsClear(valueLabels, chart.plotted, chart.height)
    })

    it(`lays out 7-day ${metric} in zh-TW without label overlap or geometry hits`, () => {
      const trend = getWearableMetricSummary('apple-watch', metric, 7)!.trend
      const texts = trend.map(point =>
        formatWearableChartValue(point.value, metric, 'zh-TW', tZh)
      )
      const { chart, valueLabels } = plotHealthTrendWithValueLabels(trend, texts, 'zh-TW', metric)
      expect(valueLabels).toHaveLength(7)
      assertTrendValueLabelsClear(valueLabels, chart.plotted, chart.height)
      if (metric === 'sleep_minutes') {
        expect(texts).toContain('6 小時 30 分')
        expect(texts).toContain('7 小時')
        expect(texts.some(text => text.includes(':'))).toBe(false)
      }
    })
  }

  it('rejects boxes that sit on the trend line', () => {
    const trend = getWearableMetricSummary('apple-watch', 'sleep_minutes', 7)!.trend
    const { chart } = plotHealthTrendWithValueLabels(trend, ['x'], 'en', 'sleep_minutes')
    const mid = chart.plotted[3]!
    const onLine = {
      left: mid.x - 20,
      right: mid.x + 20,
      top: mid.y - 4,
      bottom: mid.y + 4
    }
    expect(trendLabelCollidesWithGeometry(onLine, chart.plotted)).toBe(true)
  })
})
