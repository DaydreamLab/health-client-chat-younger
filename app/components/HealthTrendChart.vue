<template>
  <svg
    class="h-56 w-full overflow-visible"
    :viewBox="`0 0 ${chart.width} ${chart.height}`"
    role="img"
    :aria-label="ariaLabel ?? $t('member.trendTitle')"
    :data-testid="metricType ? 'wearables-trend-chart' : undefined"
    :style="trendLineCssVars"
  >
    <defs>
      <linearGradient
        :id="gradientId"
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
      :fill="`url(#${gradientId})`"
    />
    <g
      v-for="point in axisLabelPoints"
      :key="`axis-${point.key}`"
    >
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
    </g>
    <text
      v-if="denseChartUnit"
      :x="12"
      :y="18"
      text-anchor="start"
      class="pointer-events-none text-muted"
      fill="currentColor"
      font-size="11"
      font-weight="600"
      data-testid="wearables-chart-unit"
    >
      {{ denseChartUnit }}
    </text>
    <text
      v-for="label in wearablesValueLabels"
      :key="`value-${label.index}`"
      :x="label.x"
      :y="label.y"
      text-anchor="middle"
      dominant-baseline="middle"
      class="pointer-events-none text-highlighted wearables-trend-value-label"
      fill="currentColor"
      font-size="11"
      font-weight="600"
    >
      {{ label.text }}
    </text>
    <template
      v-for="point in chart.plotted"
      :key="`member-value-${point.key}`"
    >
      <text
        v-if="!metricType"
        :x="point.x"
        :y="point.y - 18"
        text-anchor="middle"
        class="pointer-events-none text-highlighted"
        fill="currentColor"
        font-size="11"
        font-weight="600"
      >
        {{ point.value }}
      </text>
    </template>
    <path
      fill="none"
      stroke="var(--color-chart-primary)"
      stroke-width="3"
      stroke-linecap="round"
      stroke-linejoin="round"
      :d="chart.linePath"
      :class="metricType ? 'wearables-trend-line' : 'app-trend-line'"
      :data-testid="metricType ? 'wearables-trend-line' : undefined"
    />
    <g
      v-for="point in chart.plotted"
      :key="`point-${point.key}`"
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
    </g>
  </svg>
</template>

<script setup lang="ts">
import { healthTrend } from '~/utils/health-demo'
import type { HealthTrendChartPoint } from '~/utils/health-trend-chart'
import {
  HEALTH_TREND_VALUE_LABEL_MAX_POINTS,
  plotHealthTrend,
  plotHealthTrendWithValueLabels,
  shouldShowTrendAxisLabel
} from '~/utils/health-trend-chart'
import type { WearableMetricType } from '~/utils/wearables-mock'
import {
  formatTrendWeekdayLabel,
  formatWearableChartUnit,
  formatWearableChartValue
} from '~/utils/wearables-format'

const props = defineProps<{
  points?: HealthTrendChartPoint[]
  ariaLabel?: string
  /** When set, chart point labels include localized units (wearables detail). */
  metricType?: WearableMetricType
}>()

const { t, locale } = useI18n()
const gradientId = `health-trend-fill-${useId()}`

const series = computed(() => props.points ?? [...healthTrend])

const showValueLabels = computed(() => {
  if (props.metricType) {
    return series.value.length <= HEALTH_TREND_VALUE_LABEL_MAX_POINTS
  }
  return true
})

const trendLayout = computed(() => {
  const points = series.value
  if (!props.metricType || !showValueLabels.value) {
    return { chart: plotHealthTrend(points), valueLabels: [] as ReturnType<typeof plotHealthTrendWithValueLabels>['valueLabels'] }
  }
  const texts = points.map(point =>
    formatWearableChartValue(point.value, props.metricType!, locale.value, t)
  )
  return plotHealthTrendWithValueLabels(points, texts, locale.value, props.metricType)
})

const chart = computed(() => trendLayout.value.chart)
const wearablesValueLabels = computed(() => trendLayout.value.valueLabels)

const axisLabelPoints = computed(() =>
  chart.value.plotted.filter((_, index) =>
    shouldShowTrendAxisLabel(index, chart.value.plotted.length)
  )
)

/** Dense series (e.g. 30-day) omit per-point value labels; show unit like 7-day wording. */
const denseChartUnit = computed(() => {
  if (!props.metricType || showValueLabels.value) {
    return ''
  }
  return formatWearableChartUnit(props.metricType, t)
})

const trendLineCssVars = computed(() => ({
  '--trend-path-length': String(chart.value.pathLength)
}))

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

function pointTooltip(point: HealthTrendChartPoint) {
  if (!props.metricType) {
    return String(point.value)
  }
  const value = formatWearableChartValue(point.value, props.metricType, locale.value, t)
  const axis = pointLabel(point)
  return `${axis}: ${value}`
}
</script>
