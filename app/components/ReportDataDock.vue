<script setup lang="ts">
import type { HealthReportResult } from '~/utils/candor-api'

const props = defineProps<{
  open: boolean
  collapsed: boolean
  results: HealthReportResult[]
  reportId?: string | null
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
  'update:collapsed': [value: boolean]
  'updated': [results: HealthReportResult[]]
}>()

function toggle() {
  emit('update:collapsed', !props.collapsed)
}

function onUpdated(results: HealthReportResult[]) {
  emit('updated', results)
}
</script>

<template>
  <div
    v-if="open"
    class="absolute inset-x-3 top-3 z-20 flex flex-col overflow-hidden rounded-2xl border border-default bg-elevated shadow-lg sm:inset-x-4"
    :class="collapsed ? 'h-auto' : 'h-[min(50%,28rem)] min-h-[12rem]'"
    data-testid="chat-report-dock"
  >
    <div class="flex shrink-0 items-center justify-between gap-3 border-b border-default px-4 py-3 sm:px-5">
      <div class="flex min-w-0 items-center gap-2.5">
        <span class="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary ring-1 ring-primary/20">
          <UIcon
            name="i-lucide-clipboard-list"
            class="size-4"
          />
        </span>
        <div class="min-w-0">
          <p class="truncate text-sm font-semibold text-highlighted">
            {{ $t('labChart.dockTitle') }}
          </p>
          <p class="truncate text-xs text-muted">
            {{ $t('labChart.hint') }}
          </p>
        </div>
      </div>
      <button
        type="button"
        class="app-btn app-btn-ghost size-9 shrink-0 px-0"
        :aria-label="collapsed ? $t('labChart.expand') : $t('labChart.collapse')"
        data-testid="chat-report-dock-toggle"
        @click="toggle"
      >
        <UIcon
          :name="collapsed ? 'i-lucide-chevron-down' : 'i-lucide-chevron-up'"
          class="size-4"
        />
      </button>
    </div>

    <div
      v-show="!collapsed"
      class="flex min-h-0 flex-1 flex-col"
    >
      <div class="shrink-0 border-b border-default px-4 py-2.5 sm:px-5">
        <ReportResultLegend />
      </div>
      <div class="min-h-0 flex-1 overflow-auto px-4 py-3 sm:px-5">
        <ReportResultTable
          :results="results"
          :report-id="reportId"
          :show-legend="false"
          @updated="onUpdated"
        />
      </div>
    </div>
  </div>
</template>
