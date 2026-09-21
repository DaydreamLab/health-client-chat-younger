<template>
  <ul class="space-y-2.5">
    <li
      v-for="marker in markers"
      :key="marker.key"
      class="relative flex min-h-11 items-center gap-2 overflow-hidden rounded-md bg-elevated py-2.5 pe-3 ps-5"
    >
      <span
        class="absolute inset-y-0 start-0 w-2"
        :class="barClass(marker.status)"
      />
      <div class="flex min-w-0 flex-1 flex-wrap items-baseline gap-x-1.5">
        <p class="text-sm font-medium text-toned">
          {{ $t(`markers.${marker.key}`) }}
        </p>
        <p class="text-xs text-muted">
          {{ $t('member.range', { range: marker.range }) }}
        </p>
      </div>
      <p
        class="shrink-0 text-sm font-semibold tabular-nums"
        :class="tone === 'abnormal' ? valueClass(marker.status) : 'text-highlighted'"
      >
        {{ formatValue(marker) }}
      </p>
      <span
        class="app-badge shrink-0"
        :class="pillClass(marker.status)"
      >
        {{ $t(`member.status${capitalize(marker.status)}`) }}
      </span>
    </li>
  </ul>
</template>

<script setup lang="ts">
import type { HealthMarker, HealthStatus } from '~/utils/health-demo'

defineProps<{
  markers: HealthMarker[]
  tone: 'abnormal' | 'all'
}>()

function capitalize(value: string) {
  return value.slice(0, 1).toUpperCase() + value.slice(1)
}

function formatValue(marker: HealthMarker) {
  return marker.unit ? `${marker.value} ${marker.unit}` : String(marker.value)
}

function barClass(status: HealthStatus) {
  return {
    ok: 'bg-success',
    low: 'bg-warning',
    high: 'bg-error'
  }[status]
}

function valueClass(status: HealthStatus) {
  return {
    ok: 'text-success',
    low: 'text-warning',
    high: 'text-error'
  }[status]
}

function pillClass(status: HealthStatus) {
  return {
    ok: 'bg-success/10 text-success',
    low: 'bg-warning/10 text-warning',
    high: 'bg-error/10 text-error'
  }[status]
}
</script>
