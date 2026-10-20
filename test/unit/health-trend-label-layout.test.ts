import { describe, expect, it } from 'vitest'
import en from '../../i18n/locales/en.json'
import zh from '../../i18n/locales/zh-TW.json'
import type {
  layoutHealthTrendValueLabels } from '../../app/utils/health-trend-chart'
import {
  plotHealthTrendWithValueLabels
} from '../../app/utils/health-trend-chart'
import {
  formatWearableChartPointValue
} from '../../app/utils/wearables-format'
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

function overlaps(
  a: { left: number, right: number, top: number, bottom: number },
  b: { left: number, right: number, top: number, bottom: number }
) {
  return a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top
}

function assertNoOverlapOrClip(
  labels: ReturnType<typeof layoutHealthTrendValueLabels>,
  chartHeight: number
) {
  for (const label of labels) {
    expect(label.top).toBeGreaterThanOrEqual(2)
    expect(label.bottom).toBeLessThanOrEqual(chartHeight - 4)
  }
  for (let i = 0; i < labels.length; i++) {
    for (let j = i + 1; j < labels.length; j++) {
      expect(overlaps(labels[i]!, labels[j]!)).toBe(false)
    }
  }
}

const metrics: WearableMetricType[] = ['resting_hr', 'steps', 'sleep_minutes']

describe('plotHealthTrendWithValueLabels', () => {
  for (const metric of metrics) {
    it(`lays out 7-day ${metric} labels in English without overlap or clip`, () => {
      const trend = getWearableMetricSummary('apple-watch', metric, 7)!.trend
      const texts = trend.map(point =>
        formatWearableChartPointValue(point.value, metric, 'en', tEn)
      )
      const { chart, valueLabels } = plotHealthTrendWithValueLabels(trend, texts, 'en')
      expect(valueLabels).toHaveLength(7)
      assertNoOverlapOrClip(valueLabels, chart.height)
    })

    it(`lays out 7-day ${metric} labels in zh-TW without overlap or clip`, () => {
      const trend = getWearableMetricSummary('apple-watch', metric, 7)!.trend
      const texts = trend.map(point =>
        formatWearableChartPointValue(point.value, metric, 'zh-TW', tZh)
      )
      const { chart, valueLabels } = plotHealthTrendWithValueLabels(trend, texts, 'zh-TW')
      expect(valueLabels).toHaveLength(7)
      assertNoOverlapOrClip(valueLabels, chart.height)
      if (metric === 'sleep_minutes') {
        expect(texts).toContain('6:30')
        expect(texts).toContain('7:10')
      }
    })
  }
})
