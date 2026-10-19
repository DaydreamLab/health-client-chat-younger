<template>
  <svg
    class="h-48 w-full"
    viewBox="0 0 420 180"
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
      v-for="point in chart.plotted"
      :key="point.key"
    >
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
        :y="168"
        text-anchor="middle"
        class="text-muted"
        fill="currentColor"
        font-size="11"
      >
        {{ pointLabel(point) }}
      </text>
      <text
        :x="point.x"
        :y="point.y - 10"
        text-anchor="middle"
        class="text-highlighted"
        fill="currentColor"
        font-size="11"
        font-weight="600"
      >
        {{ point.value }}
      </text>
    </g>
  </svg>
</template>

<script setup lang="ts">
import { healthTrend } from '~/utils/health-demo'
import type { HealthTrendChartPoint } from '~/utils/health-trend-chart'
import { plotHealthTrend } from '~/utils/health-trend-chart'

const props = defineProps<{
  points?: HealthTrendChartPoint[]
  ariaLabel?: string
}>()

const { t } = useI18n()

const series = computed(() => props.points ?? [...healthTrend])

const chart = computed(() => plotHealthTrend(series.value))

function pointLabel(point: HealthTrendChartPoint) {
  if (point.label) {
    return point.label
  }
  return t(`member.months.${point.key}`)
}
</script>
