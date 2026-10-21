import type { WearableMetricType } from '~/utils/wearables-mock'

/** Monday = 0 … Sunday = 6 (matches mock 7-day series order). */
export function formatTrendWeekdayLabel(weekdayIndex: number, locale: string): string {
  const monday = new Date(Date.UTC(2024, 0, 1 + weekdayIndex))
  return new Intl.DateTimeFormat(locale === 'en' ? 'en-US' : 'zh-TW', { weekday: 'short' }).format(monday)
}

export function formatSleepDurationMinutes(
  totalMinutes: number,
  t: (key: string, params?: Record<string, unknown>) => string
): string {
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  if (hours > 0 && minutes === 0) {
    return t('wearables.units.sleepHoursOnly', { hours })
  }
  if (hours === 0) {
    return t('wearables.units.sleepMinutesOnly', { minutes: totalMinutes })
  }
  return t('wearables.units.sleepMixed', { hours, minutes })
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
  return formatSleepDurationMinutes(value, t)
}

/**
 * Unit wording aligned with 7-day chart value labels (`chartBpm` / `chartSteps` /
 * sleep duration keys), for dense charts that omit per-point labels.
 */
export function formatWearableChartUnit(
  metric: WearableMetricType,
  t: (key: string) => string
): string {
  if (metric === 'resting_hr') {
    return t('wearables.units.chartUnitBpm')
  }
  if (metric === 'steps') {
    return t('wearables.units.chartUnitSteps')
  }
  return t('wearables.units.chartUnitSleep')
}

export function localizedRestingHrUnit(locale: string, t: (key: string) => string): string {
  return locale === 'en' ? 'bpm' : t('wearables.units.bpmShort')
}
