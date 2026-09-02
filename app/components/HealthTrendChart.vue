<template>
  <svg
    class="h-48 w-full"
    viewBox="0 0 420 180"
    role="img"
    :aria-label="$t('member.trendTitle')"
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
      :d="areaPath"
      fill="url(#health-trend-fill)"
    />
    <polyline
      fill="none"
      stroke="var(--color-chart-primary)"
      stroke-width="3"
      stroke-linecap="round"
      stroke-linejoin="round"
      :points="linePoints"
      class="app-trend-line"
    />
    <g
      v-for="point in plotted"
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
        {{ $t(`member.months.${point.key}`) }}
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

const width = 420
const height = 180
const padX = 28
const padTop = 24
const padBottom = 36
const values = healthTrend.map(item => item.value)
const min = Math.min(...values) - 8
const max = Math.max(...values) + 4

const plotted = healthTrend.map((item, index) => {
  const x = padX + (index / (healthTrend.length - 1)) * (width - padX * 2)
  const y = padTop + (1 - (item.value - min) / (max - min)) * (height - padTop - padBottom)
  return { ...item, x, y }
})

const linePoints = plotted.map(point => `${point.x},${point.y}`).join(' ')
const areaPath = `M ${plotted[0]!.x} ${height - padBottom} L ${plotted.map(point => `${point.x} ${point.y}`).join(' L ')} L ${plotted.at(-1)!.x} ${height - padBottom} Z`
</script>
