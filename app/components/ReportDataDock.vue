<script setup lang="ts">
import type { HealthReportResult } from '~/utils/candor-api'

const props = defineProps<{
  open: boolean
  collapsed: boolean
  results: HealthReportResult[]
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
  'update:collapsed': [value: boolean]
}>()

function toggle() {
  emit('update:collapsed', !props.collapsed)
}

function close() {
  emit('update:open', false)
  emit('update:collapsed', false)
}
</script>

<template>
  <div
    v-if="open"
    class="report-dock absolute inset-x-0 top-0 z-20 flex flex-col overflow-hidden rounded-xl border shadow-lg"
    :class="collapsed ? 'h-auto' : 'h-1/2 min-h-[11rem]'"
    data-testid="chat-report-dock"
  >
    <div class="report-dock-head flex shrink-0 items-center justify-between gap-3 px-3 py-2.5 sm:px-4">
      <strong class="text-sm font-semibold tracking-wide">
        {{ $t('labChart.dockTitle') }}
      </strong>
      <div class="flex gap-2">
        <button
          type="button"
          class="rounded-md bg-white/15 px-2.5 py-1 text-xs text-white"
          data-testid="chat-report-dock-toggle"
          @click="toggle"
        >
          {{ collapsed ? $t('labChart.expand') : $t('labChart.collapse') }}
        </button>
        <button
          type="button"
          class="rounded-md bg-white/15 px-2.5 py-1 text-xs text-white"
          data-testid="chat-report-dock-close"
          @click="close"
        >
          {{ $t('labChart.close') }}
        </button>
      </div>
    </div>

    <div
      v-show="!collapsed"
      class="report-dock-body min-h-0 flex-1 overflow-auto px-3 py-3 sm:px-4"
    >
      <ReportResultTable :results="results" />
    </div>
  </div>
</template>

<style scoped>
.report-dock {
  background: #f7f8f8;
  border-color: #d5dddf;
  color: #1f2a2e;
  font-family: "Noto Sans TC", "IBM Plex Sans", sans-serif;
}

.report-dock-head {
  background: #2f6f6a;
  color: #fff;
  border-bottom: 1px solid #cfd8da;
}
</style>
