<template>
  <div class="divide-y divide-default overflow-hidden rounded-xl border border-default bg-elevated">
    <details
      v-for="(system, index) in healthSystems"
      :key="system.key"
      class="group"
      :open="index === 0"
    >
      <summary class="flex cursor-pointer list-none items-center justify-between gap-3 px-5 py-4">
        <span class="flex items-center gap-3">
          <span
            class="size-2.5 rounded-full"
            :style="{ backgroundColor: system.color }"
          />
          <span class="font-medium text-highlighted">
            <h3 class="text-base font-medium">
              {{ $t(`systems.${system.key}`) }}
            </h3>
          </span>
        </span>
        <span class="tabular-nums text-sm text-muted">
          {{ system.score }}
        </span>
      </summary>
      <ul class="space-y-3 px-5 pb-5">
        <li
          v-for="marker in system.markers"
          :key="marker.key"
          class="flex flex-wrap items-baseline justify-between gap-2"
        >
          <div>
            <p class="text-sm text-highlighted">
              {{ $t(`markers.${marker.key}`) }}
            </p>
            <p class="text-xs text-dimmed">
              {{ $t('member.range', { range: marker.range }) }}
            </p>
          </div>
          <div class="text-end">
            <p class="tabular-nums text-sm font-medium text-highlighted">
              {{ marker.value }}
              <span class="text-xs font-normal text-dimmed">{{ marker.unit }}</span>
            </p>
            <p
              class="text-xs"
              :class="{
                'text-success': marker.status === 'ok',
                'text-warning': marker.status === 'low',
                'text-error': marker.status === 'high'
              }"
            >
              {{ $t(`member.status${capitalize(marker.status)}`) }}
            </p>
          </div>
        </li>
      </ul>
    </details>
  </div>
</template>

<script setup lang="ts">
import { healthSystems } from '~/utils/health-demo'

function capitalize(value: string) {
  return value.slice(0, 1).toUpperCase() + value.slice(1)
}
</script>
