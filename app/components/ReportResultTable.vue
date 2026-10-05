<script setup lang="ts">
import type { HealthReportResult } from '~/utils/candor-api'
import {
  displayResultValue,
  formatResultRef,
  resultGaugePct,
  resultStatusClass,
  resultStatusLabel
} from '~/utils/report-result-status'

withDefaults(defineProps<{
  results: HealthReportResult[]
  /** Kept for call-site compatibility; member UI is display-only (no correction). */
  reportId?: string | null
  /** When false, parent renders ReportResultLegend outside the scroll area. */
  showLegend?: boolean
  /** Hide the scrollbars of the table scroller (card and full-window reading). */
  hideScrollbar?: boolean
}>(), {
  showLegend: true,
  hideScrollbar: false
})

/** @deprecated Member UI no longer patches results; emit retained for parent wiring. */
defineEmits<{
  updated: [results: HealthReportResult[]]
}>()
</script>

<template>
  <div
    class="flex flex-col"
    :class="hideScrollbar ? 'min-h-0 flex-1' : undefined"
    data-testid="report-result-table"
  >
    <div
      v-if="showLegend"
      class="mb-3 shrink-0"
    >
      <ReportResultLegend />
    </div>

    <p
      v-if="!results.length"
      class="text-sm text-muted"
      data-testid="report-result-empty"
    >
      {{ $t('labChart.empty') }}
    </p>

    <div
      v-if="results.length"
      class="overflow-auto rounded-lg border border-default bg-default"
      :class="hideScrollbar ? 'scrollbar-none min-h-0 flex-1' : undefined"
    >
      <table class="w-max max-w-full min-w-[32rem] border-separate border-spacing-0 text-sm">
        <thead>
          <tr class="text-left text-xs font-semibold text-muted">
            <th class="sticky top-0 z-10 min-w-[6.5rem] whitespace-nowrap border-b border-dashed border-default bg-muted px-2.5 py-2">
              {{ $t('labChart.status') }}
            </th>
            <th class="sticky top-0 z-10 border-b border-dashed border-default bg-muted px-2.5 py-2">
              {{ $t('labChart.item') }}
            </th>
            <th class="sticky top-0 z-10 border-b border-dashed border-default bg-muted px-2.5 py-2">
              {{ $t('labChart.value') }}
            </th>
            <th class="sticky top-0 z-10 border-b border-dashed border-default bg-muted px-2.5 py-2">
              {{ $t('labChart.unit') }}
            </th>
            <th class="sticky top-0 z-10 border-b border-dashed border-default bg-muted px-2.5 py-2">
              {{ $t('labChart.refRange') }}
            </th>
            <th class="sticky top-0 z-10 border-b border-dashed border-default bg-muted px-2.5 py-2">
              {{ $t('labChart.position') }}
            </th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="row in results"
            :key="row.id"
            class="last:[&>td]:border-b-0"
            :data-testid="`report-result-row-${row.id}`"
          >
            <td class="min-w-[6.5rem] whitespace-nowrap border-b border-dashed border-default px-2.5 py-2.5 text-highlighted">
              <i
                class="yr-dot"
                :class="resultStatusClass(row)"
              />{{ resultStatusLabel(resultStatusClass(row)) }}
            </td>
            <td class="border-b border-dashed border-default px-2.5 py-2.5 font-semibold text-highlighted">
              {{ row.raw_name || row.biomarker_id || '—' }}
            </td>
            <td
              class="border-b border-dashed border-default px-2.5 py-2.5 text-base font-bold"
              :class="`yr-val-${resultStatusClass(row)}`"
            >
              {{ displayResultValue(row) }}
            </td>
            <td class="border-b border-dashed border-default px-2.5 py-2.5 text-muted">
              {{ row.unit || row.raw_unit || '—' }}
            </td>
            <td class="border-b border-dashed border-default px-2.5 py-2.5 text-xs text-muted">
              {{ formatResultRef(row) }}
            </td>
            <td class="overflow-visible border-b border-dashed border-default px-2.5 py-2.5">
              <div
                v-if="resultGaugePct(row) != null"
                class="yr-gauge relative h-2 w-[4.5rem] overflow-visible rounded-full"
              >
                <div
                  class="yr-gauge-marker absolute top-[-3px] h-3.5 -translate-x-1/2 rounded-sm"
                  :style="{ left: `${resultGaugePct(row)}%` }"
                />
              </div>
              <span
                v-else
                class="text-muted"
              >—</span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<style scoped>
.scrollbar-none {
  scrollbar-width: none;
}

.scrollbar-none::-webkit-scrollbar {
  display: none;
}

.yr-dot {
  display: inline-block;
  width: 0.55rem;
  height: 0.55rem;
  margin-right: 0.3rem;
  vertical-align: middle;
  border-radius: 999px;
}

.yr-dot.ok {
  background: var(--ui-success);
}

.yr-dot.warn {
  background: var(--ui-warning);
}

.yr-dot.alert {
  background: var(--ui-error);
}

.yr-dot.unknown {
  background: var(--ui-text-dimmed);
}

.yr-val-ok {
  color: var(--ui-success);
}

.yr-val-warn {
  color: var(--ui-warning);
}

.yr-val-alert {
  color: var(--ui-error);
}

.yr-val-unknown {
  color: var(--ui-text-muted);
}

.yr-gauge {
  background: linear-gradient(
    90deg,
    color-mix(in oklab, var(--ui-error) 85%, transparent) 0%,
    color-mix(in oklab, var(--ui-warning) 85%, transparent) 28%,
    color-mix(in oklab, var(--ui-success) 85%, transparent) 50%,
    color-mix(in oklab, var(--ui-warning) 85%, transparent) 72%,
    color-mix(in oklab, var(--ui-error) 85%, transparent) 100%
  );
}

.yr-gauge-marker {
  width: 3px;
  background: var(--ui-text-highlighted);
  box-shadow: 0 0 0 1px var(--ui-bg-elevated);
}
</style>
