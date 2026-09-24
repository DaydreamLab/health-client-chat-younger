<script setup lang="ts">
import type { HealthReportResult } from '~/utils/candor-api'
import {
  displayResultValue,
  formatResultRef,
  resultGaugePct,
  resultStatusClass,
  resultStatusLabel
} from '~/utils/report-result-status'

defineProps<{
  results: HealthReportResult[]
}>()
</script>

<template>
  <div data-testid="report-result-table">
    <div class="mb-3 flex flex-wrap items-center gap-3 rounded-lg bg-muted px-2.5 py-2 text-xs text-muted">
      <span><i class="yr-dot ok" />{{ $t('labChart.optimal') }}</span>
      <span><i class="yr-dot warn" />{{ $t('labChart.caution') }}</span>
      <span><i class="yr-dot alert" />{{ $t('labChart.alert') }}</span>
      <span class="ms-auto text-dimmed">{{ $t('labChart.colorHint') }}</span>
    </div>

    <p
      v-if="!results.length"
      class="text-sm text-muted"
      data-testid="report-result-empty"
    >
      {{ $t('labChart.empty') }}
    </p>

    <div
      v-else
      class="overflow-auto rounded-lg border border-default bg-default"
    >
      <table class="w-full min-w-[32rem] border-collapse text-sm">
        <thead>
          <tr class="bg-muted text-left text-xs font-semibold text-muted">
            <th class="border-b border-dashed border-default px-2.5 py-2">
              {{ $t('labChart.status') }}
            </th>
            <th class="border-b border-dashed border-default px-2.5 py-2">
              {{ $t('labChart.item') }}
            </th>
            <th class="border-b border-dashed border-default px-2.5 py-2">
              {{ $t('labChart.value') }}
            </th>
            <th class="border-b border-dashed border-default px-2.5 py-2">
              {{ $t('labChart.unit') }}
            </th>
            <th class="border-b border-dashed border-default px-2.5 py-2">
              {{ $t('labChart.refRange') }}
            </th>
            <th class="border-b border-dashed border-default px-2.5 py-2">
              {{ $t('labChart.position') }}
            </th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="row in results"
            :key="row.id"
            class="border-b border-dashed border-default last:border-0"
            :data-testid="`report-result-row-${row.id}`"
          >
            <td class="px-2.5 py-2.5 text-highlighted">
              <i
                class="yr-dot"
                :class="resultStatusClass(row)"
              />{{ resultStatusLabel(resultStatusClass(row)) }}
            </td>
            <td class="px-2.5 py-2.5 font-semibold text-highlighted">
              {{ row.raw_name || row.biomarker_id || '—' }}
            </td>
            <td
              class="px-2.5 py-2.5 text-base font-bold"
              :class="`yr-val-${resultStatusClass(row)}`"
            >
              {{ displayResultValue(row) }}
            </td>
            <td class="px-2.5 py-2.5 text-muted">
              {{ row.unit || row.raw_unit || '—' }}
            </td>
            <td class="px-2.5 py-2.5 text-xs text-muted">
              {{ formatResultRef(row) }}
            </td>
            <td class="overflow-visible px-2.5 py-2.5">
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
.yr-dot {
  display: inline-block;
  width: 0.55rem;
  height: 0.55rem;
  margin-right: 0.3rem;
  vertical-align: middle;
  border-radius: 999px;
}

.yr-dot.ok {
  background: #3bb273;
}

.yr-dot.warn {
  background: #e2a23a;
}

.yr-dot.alert {
  background: #e35d8c;
}

.yr-dot.unknown {
  background: #9aa7ab;
}

.yr-val-ok {
  color: #2f9b5f;
}

.yr-val-warn {
  color: #c8871f;
}

.yr-val-alert {
  color: #c94474;
}

.yr-val-unknown {
  color: #5b6b6f;
}

.yr-gauge {
  background: linear-gradient(
    90deg,
    color-mix(in oklab, #e35d8c 85%, transparent) 0%,
    color-mix(in oklab, #e2a23a 85%, transparent) 28%,
    color-mix(in oklab, #3bb273 85%, transparent) 50%,
    color-mix(in oklab, #e2a23a 85%, transparent) 72%,
    color-mix(in oklab, #e35d8c 85%, transparent) 100%
  );
}

.yr-gauge-marker {
  width: 3px;
  background: var(--ui-text-highlighted);
  box-shadow: 0 0 0 1px #fff;
}
</style>
