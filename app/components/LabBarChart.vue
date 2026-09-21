<template>
  <div
    class="min-h-[280px]"
    data-testid="lab-bar-chart"
  >
    <ClientOnly>
      <BarChart
        v-if="!chartFailed"
        :data="rows"
        :height="280"
        x-axis="key"
        :categories="categories"
        :y-axis="['yours', 'ref']"
        :radius="4"
        :bar-padding="0.2"
        :y-grid-line="true"
        :x-formatter="xFormatter"
        :y-formatter="yFormatter"
        :hide-legend="false"
        :legend-position="LegendPosition.TopRight"
      />
      <svg
        v-else
        class="h-[280px] w-full"
        viewBox="0 0 640 280"
        role="img"
        :aria-label="$t('labChart.title')"
      >
        <g
          v-for="(row, index) in rows"
          :key="row.key"
        >
          <rect
            :x="barX(index)"
            :y="barY(row.yours)"
            :width="barWidth"
            :height="barHeight(row.yours)"
            fill="#0784B1"
            rx="3"
          />
          <rect
            :x="barX(index) + barWidth + 4"
            :y="barY(row.ref)"
            :width="barWidth"
            :height="barHeight(row.ref)"
            fill="#9FB3C5"
            rx="3"
          />
          <text
            :x="barX(index) + barWidth"
            y="268"
            text-anchor="middle"
            fill="currentColor"
            class="text-muted"
            font-size="11"
          >
            {{ t(`markers.${row.key}`) }}
          </text>
        </g>
      </svg>
      <template #fallback>
        <div class="flex h-[280px] items-center justify-center text-sm text-muted">
          {{ $t('labChart.title') }}
        </div>
      </template>
    </ClientOnly>
  </div>
</template>

<script setup lang="ts">
import { LegendPosition } from 'nuxt-charts/enums'
import { labChartRows } from '~/utils/first-order'

const { t } = useI18n()
const chartFailed = ref(false)

const rows = labChartRows.map(row => ({
  key: row.key,
  yours: row.yours,
  ref: row.ref
}))

const maxValue = Math.max(...rows.flatMap(row => [row.yours, row.ref]))
const plotWidth = 600
const plotTop = 16
const plotBottom = 248
const barWidth = 18

const categories = computed(() => ({
  yours: {
    name: t('labChart.yours'),
    color: '#0784B1'
  },
  ref: {
    name: t('labChart.ref'),
    color: '#9FB3C5'
  }
}))

function barX(index: number) {
  return 24 + index * (plotWidth / rows.length)
}

function barY(value: number) {
  return plotBottom - barHeight(value)
}

function barHeight(value: number) {
  return (value / maxValue) * (plotBottom - plotTop)
}

function xFormatter(value: string | number) {
  const key = typeof value === 'string' ? value : rows[value]?.key
  return key ? t(`markers.${key}`) : ''
}

function yFormatter(tick: number) {
  return String(tick)
}

onErrorCaptured(() => {
  chartFailed.value = true
  return false
})
</script>
