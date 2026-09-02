<template>
  <div class="flex flex-col items-center gap-4 sm:flex-row sm:items-center">
    <svg
      class="size-44 shrink-0"
      viewBox="0 0 140 140"
      role="img"
      :aria-label="$t('member.pieTitle')"
    >
      <g transform="translate(70 70) rotate(-90)">
        <circle
          v-for="segment in segments"
          :key="segment.key"
          r="46"
          fill="none"
          :stroke="segment.color"
          stroke-width="18"
          :stroke-dasharray="`${segment.length} ${circumference}`"
          :stroke-dashoffset="segment.offset"
        />
      </g>
    </svg>
    <ul class="w-full space-y-2 text-sm">
      <li
        v-for="segment in segments"
        :key="segment.key"
        class="flex items-center justify-between gap-3"
      >
        <span class="flex items-center gap-2 text-highlighted">
          <span
            class="size-2.5 rounded-full"
            :style="{ backgroundColor: segment.color }"
          />
          {{ $t(`systems.${segment.key}`) }}
        </span>
        <span class="tabular-nums text-muted">
          {{ segment.score }}
        </span>
      </li>
    </ul>
  </div>
</template>

<script setup lang="ts">
import { healthSystems } from '~/utils/health-demo'

const radius = 46
const circumference = 2 * Math.PI * radius
const total = healthSystems.reduce((sum, item) => sum + item.score, 0)

const segments = (() => {
  let cursor = 0
  return healthSystems.map((item) => {
    const length = (item.score / total) * circumference
    const offset = -cursor
    cursor += length
    return { ...item, length, offset }
  })
})()
</script>
