import type { WearableMetricType } from '~/utils/wearables-mock'

/** Monday = 0 … Sunday = 6 (matches mock 7-day series order). */
export function formatTrendWeekdayLabel(weekdayIndex: number, locale: string): string {
  const monday = new Date(Date.UTC(2024, 0, 1 + weekdayIndex))
  return new Intl.DateTimeFormat(locale === 'en' ? 'en-US' : 'zh-TW', { weekday: 'short' }).format(monday)
}

export function formatWearableChartValue(
  value: number,
  metric: WearableMetricType,
  locale: string,
  t: (key: string, params?: Record<string, unknown>) => string
): string {
  if (metric === 'resting_hr') {
    return t('wearables.units.chartBpm', { value })
  }
  if (metric === 'steps') {
    return t('wearables.units.chartSteps', {
      value: value.toLocaleString(locale === 'en' ? 'en-US' : 'zh-TW')
    })
  }
  const hours = Math.floor(value / 60)
  const minutes = value % 60
  if (hours > 0) {
    return t('wearables.units.chartSleepDuration', { hours, minutes })
  }
  return t('wearables.units.chartSleepMinutes', { value })
}

export function localizedRestingHrUnit(locale: string, t: (key: string) => string): string {
  return locale === 'en' ? 'bpm' : t('wearables.units.bpmShort')
}
