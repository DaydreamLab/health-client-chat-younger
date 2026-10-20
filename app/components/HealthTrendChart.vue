<template>
  <svg
    class="h-52 w-full"
    :viewBox="`0 0 420 ${chart.height}`"
    role="img"
    :aria-label="ariaLabel ?? $t('member.trendTitle')"
  >
    <defs>
      <linearGradient
        id="health-trend-fill"
        x1="0"
        y1="0"
        x2="0"
        y2="1"
      >
        <stop
          offset="0%"
          stop-color="var(--color-chart-primary)"
          stop-opacity="0.28"
        />
        <stop
          offset="100%"
          stop-color="var(--color-chart-primary)"
          stop-opacity="0"
        />
      </linearGradient>
    </defs>
    <path
      :d="chart.areaPath"
      fill="url(#health-trend-fill)"
    />
    <polyline
      fill="none"
      stroke="var(--color-chart-primary)"
      stroke-width="3"
      stroke-linecap="round"
      stroke-linejoin="round"
      :points="chart.linePoints"
      class="app-trend-line"
    />
    <g
      v-for="(point, index) in chart.plotted"
      :key="point.key"
    >
      <title v-if="metricType">
        {{ pointTooltip(point) }}
      </title>
      <circle
        :cx="point.x"
        :cy="point.y"
        r="4.5"
        fill="var(--ui-bg-elevated)"
        stroke="var(--color-chart-primary)"
        stroke-width="2"
      />
      <text
        :x="point.x"
        :y="xAxisLabelY"
        text-anchor="middle"
        class="text-muted"
        fill="currentColor"
        font-size="11"
      >
        {{ pointLabel(point) }}
      </text>
      <text
        v-if="showValueLabels"
        :x="point.x"
        :y="point.y - valueLabelOffset(index)"
        text-anchor="middle"
        class="text-highlighted"
        fill="currentColor"
        font-size="11"
        font-weight="600"
      >
        {{ formatPointValue(point) }}
      </text>
    </g>
  </svg>
</template>

<script setup lang="ts">
import { healthTrend } from '~/utils/health-demo'
import type { HealthTrendChartPoint } from '~/utils/health-trend-chart'
import {
  HEALTH_TREND_VALUE_LABEL_MAX_POINTS,
  healthTrendValueLabelOffset,
  plotHealthTrend
} from '~/utils/health-trend-chart'
import type { WearableMetricType } from '~/utils/wearables-mock'
import { formatTrendWeekdayLabel, formatWearableChartValue } from '~/utils/wearables-format'

const props = defineProps<{
  points?: HealthTrendChartPoint[]
  ariaLabel?: string
  /** When set, chart point labels include localized units (wearables detail). */
  metricType?: WearableMetricType
}>()

const { t, locale } = useI18n()

const series = computed(() => props.points ?? [...healthTrend])

const chart = computed(() => plotHealthTrend(series.value))

const showValueLabels = computed(() => {
  if (props.metricType) {
    return series.value.length <= HEALTH_TREND_VALUE_LABEL_MAX_POINTS
  }
  return true
})

const xAxisLabelY = computed(() => chart.value.height - chart.value.padBottom + 16)

function pointLabel(point: HealthTrendChartPoint) {
  if (point.weekdayIndex !== undefined) {
    return formatTrendWeekdayLabel(point.weekdayIndex, locale.value)
  }
  if (point.label) {
    return point.label
  }
  return t(`member.months.${point.key}`)
}

function formatPointValue(point: HealthTrendChartPoint) {
  if (props.metricType) {
    return formatWearableChartValue(point.value, props.metricType, locale.value, t)
  }
  return String(point.value)
}

function pointTooltip(point: HealthTrendChartPoint) {
  const value = formatPointValue(point)
  const axis = pointLabel(point)
  return `${axis}: ${value}`
}

function valueLabelOffset(index: number) {
  return healthTrendValueLabelOffset(index, chart.value.plotted)
}
</script>
