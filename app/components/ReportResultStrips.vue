<script setup lang="ts">
import type { HealthReportResult } from '~/utils/candor-api'
import {
  displayResultName,
  displayResultOriginalName,
  displayResultValue,
  formatResultRef,
  hasResultInterpretation,
  resultGaugePct,
  resultStatusClass
} from '~/utils/report-result-status'

withDefaults(defineProps<{
  results: HealthReportResult[]
  /** Hide the scrollbars of the strip scroller (list and full-window reading). */
  hideScrollbar?: boolean
}>(), {
  hideScrollbar: false
})

const { t } = useI18n()

type StripStatus = 'ok' | 'warn' | 'alert'

function stripStatus(row: HealthReportResult): StripStatus {
  const status = resultStatusClass(row)
  return status === 'unknown' ? 'warn' : status
}

function statusText(status: StripStatus) {
  if (status === 'ok') {
    return t('labChart.statusOptimal')
  }
  if (status === 'warn') {
    return t('labChart.statusCaution')
  }
  return t('labChart.statusAlert')
}
</script>

<template>
  <div
    class="flex flex-col"
    :class="hideScrollbar ? 'min-h-0 flex-1' : undefined"
    data-testid="report-result-strips"
  >
    <p
      v-if="!results.length"
      class="text-sm text-muted"
      data-testid="report-result-strips-empty"
    >
      {{ $t('labChart.empty') }}
    </p>

    <div
      v-if="results.length"
      class="flex flex-col gap-2 overflow-auto"
      :class="hideScrollbar ? 'scrollbar-none min-h-0 flex-1' : undefined"
    >
      <article
        v-for="row in results"
        :key="row.id"
        class="flex items-stretch gap-3 rounded-xl border border-default bg-default px-3 py-3"
        :data-testid="`report-result-strip-${row.id}`"
      >
        <span
          class="w-1 shrink-0 rounded-full"
          :class="`yr-bar-${stripStatus(row)}`"
        />
        <div class="min-w-0 flex-1">
          <div class="min-w-0">
            <p class="truncate font-semibold text-highlighted">
              {{ displayResultName(row) }}
            </p>
            <p
              v-if="displayResultOriginalName(row)"
              class="truncate text-xs text-muted"
              :data-testid="`report-result-raw-name-${row.id}`"
            >
              {{ displayResultOriginalName(row) }}
            </p>
          </div>
          <p class="mt-0.5 text-xs text-muted">
            {{ formatResultRef(row) }}
          </p>
          <div
            v-if="hasResultInterpretation(row)"
            class="mt-1.5 space-y-1 text-xs text-muted"
            :data-testid="`report-result-interpretation-${row.id}`"
          >
            <p
              v-if="row.description"
              class="line-clamp-2"
            >
              <span class="font-medium text-highlighted">{{ $t('labChart.description') }}：</span>{{ row.description }}
            </p>
            <p
              v-if="row.possible_causes"
              class="line-clamp-2"
            >
              <span class="font-medium text-highlighted">{{ $t('labChart.possibleCauses') }}：</span>{{ row.possible_causes }}
            </p>
            <p
              v-if="row.possible_risks"
              class="line-clamp-2"
            >
              <span class="font-medium text-highlighted">{{ $t('labChart.possibleRisks') }}：</span>{{ row.possible_risks }}
            </p>
          </div>
        </div>
        <div
          v-if="resultGaugePct(row) != null"
          class="yr-gauge relative h-2 w-[4.5rem] shrink-0 self-center overflow-visible rounded-full"
          :data-testid="`report-result-strip-position-${row.id}`"
        >
          <div
            class="yr-gauge-marker absolute top-[-3px] h-3.5 -translate-x-1/2 rounded-sm"
            :style="{ left: `${resultGaugePct(row)}%` }"
          />
        </div>
        <span
          v-else
          class="shrink-0 self-center text-sm text-muted"
        >—</span>
        <p
          class="shrink-0 self-center text-base font-bold"
          :class="`yr-val-${stripStatus(row)}`"
        >
          {{ displayResultValue(row) }}<span
            v-if="row.unit || row.raw_unit"
            class="ms-1 text-sm font-semibold"
          >{{ row.unit || row.raw_unit }}</span>
        </p>
        <span
          class="shrink-0 self-center rounded-full px-2.5 py-0.5 text-xs font-semibold"
          :class="`yr-pill-${stripStatus(row)}`"
          :data-testid="`report-result-strip-status-${row.id}`"
        >
          {{ statusText(stripStatus(row)) }}
        </span>
      </article>
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

.yr-bar-ok {
  background: var(--ui-success);
}

.yr-bar-warn {
  background: var(--ui-warning);
}

.yr-bar-alert {
  background: var(--ui-error);
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

.yr-pill-ok {
  color: var(--ui-success);
  background: color-mix(in oklab, var(--ui-success) 16%, transparent);
}

.yr-pill-warn {
  color: var(--ui-warning);
  background: color-mix(in oklab, var(--ui-warning) 16%, transparent);
}

.yr-pill-alert {
  color: var(--ui-error);
  background: color-mix(in oklab, var(--ui-error) 16%, transparent);
}

/* GAUGE_PAD_RATIO=1.5 → ref (green) is 37.5%–62.5%; flanks show wider caution/alert context. */
.yr-gauge {
  background: linear-gradient(
    90deg,
    color-mix(in oklab, var(--ui-error) 85%, transparent) 0%,
    color-mix(in oklab, var(--ui-warning) 85%, transparent) 28%,
    color-mix(in oklab, var(--ui-success) 85%, transparent) 37.5%,
    color-mix(in oklab, var(--ui-success) 85%, transparent) 62.5%,
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
