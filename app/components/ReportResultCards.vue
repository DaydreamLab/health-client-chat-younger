<script setup lang="ts">
import type { HealthReportResult } from '~/utils/candor-api'
import {
  displayResultName,
  displayResultOriginalName,
  displayResultValue,
  formatResultRef,
  hasResultInterpretation,
  resultGaugePct,
  resultScale,
  resultStatusClass
} from '~/utils/report-result-status'

const props = withDefaults(defineProps<{
  results: HealthReportResult[]
  /** Hide the scrollbars of the card scroller (card and full-window reading). */
  hideScrollbar?: boolean
  /** rail: vertical scale on the left. gauge: table position bar beside the value. */
  position?: 'rail' | 'gauge'
}>(), {
  hideScrollbar: false,
  position: 'rail'
})

const { t } = useI18n()

type CardStatus = 'ok' | 'warn' | 'alert'

function cardStatus(row: HealthReportResult): CardStatus {
  const status = resultStatusClass(row)
  return status === 'unknown' ? 'warn' : status
}

function statusText(status: CardStatus) {
  if (status === 'ok') {
    return t('labChart.statusOptimal')
  }
  if (status === 'warn') {
    return t('labChart.statusCaution')
  }
  return t('labChart.statusAlert')
}

const cards = computed(() => props.results.map(row => ({
  row,
  status: cardStatus(row),
  scale: resultScale(row),
  gaugePct: resultGaugePct(row),
  unit: row.unit || row.raw_unit || '',
  hasInfo: hasResultInterpretation(row)
})))
</script>

<template>
  <div
    class="flex h-full min-h-0 flex-1 flex-col overflow-hidden"
    data-testid="report-result-cards"
  >
    <p
      v-if="!results.length"
      class="text-sm text-muted"
      data-testid="report-result-cards-empty"
    >
      {{ $t('labChart.empty') }}
    </p>

    <div
      v-if="cards.length"
      class="min-h-0 flex-1 overflow-y-auto overscroll-contain"
      :class="hideScrollbar ? 'scrollbar-none' : undefined"
      data-testid="report-result-cards-scroller"
    >
      <div class="grid grid-cols-1 content-start gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        <article
          v-for="card in cards"
          :key="card.row.id"
          class="flex min-h-[8.5rem] items-stretch gap-3 rounded-xl border border-default bg-default px-3 py-3"
          :data-testid="`report-result-card-${card.row.id}`"
        >
          <div
            v-if="position === 'rail' && card.scale"
            class="relative w-3 shrink-0 self-stretch"
            :data-testid="`report-result-card-position-${card.row.id}`"
          >
            <div class="absolute inset-y-1 left-1/2 w-1 -translate-x-1/2">
              <div class="absolute inset-0 overflow-hidden rounded-full">
                <div
                  v-for="(band, index) in card.scale.bands"
                  :key="`${card.row.id}-${index}`"
                  class="absolute inset-x-0"
                  :class="`yr-band-${band.status}`"
                  :style="{
                    bottom: `${band.fromPct}%`,
                    height: `${band.toPct - band.fromPct}%`
                  }"
                />
              </div>
              <span
                v-if="card.scale.valuePct != null"
                class="yr-scale-marker absolute left-1/2"
                :style="{ bottom: `${card.scale.valuePct}%` }"
              />
            </div>
          </div>
          <div class="flex min-w-0 flex-1 flex-col">
            <div class="flex items-start gap-2">
              <div class="min-w-0 flex-1">
                <p class="truncate text-sm font-semibold text-highlighted">
                  {{ displayResultName(card.row) }}
                </p>
                <p
                  v-if="displayResultOriginalName(card.row)"
                  class="truncate text-xs text-muted"
                  :data-testid="`report-result-raw-name-${card.row.id}`"
                >
                  {{ displayResultOriginalName(card.row) }}
                </p>
              </div>
              <ReportResultInterpretationInfo
                v-if="card.hasInfo"
                :result="card.row"
              />
              <span
                v-else
                class="inline-flex size-7 shrink-0"
                aria-hidden="true"
              />
            </div>
            <div class="mt-2 flex items-center gap-2">
              <p
                class="text-xl font-bold leading-none"
                :class="`yr-val-${card.status}`"
              >
                {{ displayResultValue(card.row) }}
              </p>
              <div
                v-if="position === 'gauge' && card.gaugePct != null"
                class="yr-gauge relative h-2 w-[4.5rem] shrink-0 overflow-visible rounded-full"
                :data-testid="`report-result-card-position-${card.row.id}`"
              >
                <div
                  class="yr-gauge-marker absolute top-[-3px] h-3.5 -translate-x-1/2 rounded-sm"
                  :style="{ left: `${card.gaugePct}%` }"
                />
              </div>
            </div>
            <div class="mt-auto flex items-baseline justify-between gap-2 pt-3">
              <p class="min-w-0 truncate text-xs text-highlighted">
                {{ $t('labChart.optimal') }}
                <span class="text-muted">{{ formatResultRef(card.row) }}</span>
              </p>
              <p
                v-if="card.unit"
                class="shrink-0 text-xs text-muted"
              >
                {{ card.unit }}
              </p>
            </div>
          </div>
          <span
            class="sr-only"
            :data-testid="`report-result-card-status-${card.row.id}`"
          >
            {{ statusText(card.status) }}
          </span>
        </article>
      </div>
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

.yr-val-ok {
  color: var(--ui-success);
}

.yr-val-warn {
  color: var(--ui-warning);
}

.yr-val-alert {
  color: var(--ui-error);
}

.yr-band-ok {
  background: var(--ui-success);
}

.yr-band-warn {
  background: var(--ui-warning);
}

.yr-band-alert {
  background: var(--ui-error);
}

.yr-scale-marker {
  width: 7px;
  height: 7px;
  border-radius: 999px;
  background: var(--ui-bg);
  border: 2px solid var(--ui-text-highlighted);
  transform: translate(-50%, 50%);
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
