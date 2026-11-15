<script setup lang="ts">
import type { HealthReportResult } from '~/utils/candor-api'

const props = defineProps<{
  trustKey: string
  src: string
}>()

const { locale } = useI18n()

/** Images with baked-in Chinese UI — use HTML/i18n mock on EN. */
const HTML_FRAME_KEYS = new Set(['pace', 'record', 'wearable'])

const useHtmlFrame = computed(() => {
  const isEn = locale.value === 'en' || locale.value.startsWith('en-')
  return isEn && HTML_FRAME_KEYS.has(props.trustKey)
})

const recordRows = computed<HealthReportResult[]>(() => [
  {
    id: 'trust-egfr',
    raw_name: 'eGFR_CKD-EPI (2021)',
    value_numeric: 86.96,
    unit: 'mL/min/1.73m²',
    ref_low: 90,
    ref_high: 120
  },
  {
    id: 'trust-glucose',
    raw_name: 'Glucose AC',
    value_numeric: 88,
    unit: 'mg/dL',
    ref_low: 70,
    ref_high: 99
  },
  {
    id: 'trust-hba1c',
    raw_name: 'HbA1c',
    value_numeric: 5.7,
    unit: '%',
    ref_low: 4,
    ref_high: 5.6
  },
  {
    id: 'trust-hdl',
    raw_name: 'HDL-C',
    value_numeric: 58,
    unit: 'mg/dL',
    ref_low: 40,
    ref_high: 60
  }
])
</script>

<template>
  <img
    v-if="!useHtmlFrame"
    :key="trustKey"
    :src="src"
    alt=""
    class="app-trust-slide aspect-[2/1] h-auto w-full rounded-2xl object-cover lg:-translate-x-6"
    data-testid="home-trust-swatch"
    aria-hidden="true"
  >
  <div
    v-else-if="trustKey === 'pace'"
    :key="trustKey"
    class="app-trust-slide h-auto w-full rounded-2xl border border-default bg-elevated p-3 sm:p-4 lg:-translate-x-6"
    data-testid="home-trust-swatch"
    data-trust-frame="pace"
    aria-hidden="true"
  >
    <div class="flex flex-col gap-2 text-[0.65rem] leading-4 text-highlighted sm:gap-2.5 sm:text-xs sm:leading-5">
      <div class="flex items-start gap-2">
        <span
          class="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-brand-600 text-[0.55rem] font-semibold text-white"
        >Y</span>
        <p class="min-w-0 pt-0.5">
          {{ $t('trust.frameAllergyQ') }}
        </p>
      </div>
      <p class="ms-auto max-w-[85%] rounded-lg bg-default px-2.5 py-1.5 shadow-sm">
        {{ $t('trust.frameAllergyA') }}
      </p>
      <div class="flex items-start gap-2">
        <span
          class="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-brand-600 text-[0.55rem] font-semibold text-white"
        >Y</span>
        <div class="min-w-0 space-y-1.5 pt-0.5">
          <p>{{ $t('trust.frameBloodQ') }}</p>
          <p class="text-muted">
            {{ $t('trust.frameBloodHint') }}
          </p>
          <span class="inline-block rounded-md border border-default px-2.5 py-1">
            {{ $t('trust.frameBloodCta') }}
          </span>
        </div>
      </div>
      <p class="ms-auto max-w-[85%] rounded-lg bg-default px-2.5 py-1.5 shadow-sm">
        {{ $t('trust.frameBloodA') }}
      </p>
      <div class="flex items-start gap-2">
        <span
          class="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-brand-600 text-[0.55rem] font-semibold text-white"
        >Y</span>
        <div class="min-w-0 space-y-1 pt-0.5">
          <p>{{ $t('trust.frameSleepIntro') }}</p>
          <p>{{ $t('trust.frameSleepQ') }}</p>
        </div>
      </div>
      <p
        class="ms-auto max-w-[85%] rounded-lg bg-default px-2.5 py-1.5 shadow-sm"
        data-testid="home-trust-pace-last"
      >
        {{ $t('trust.frameSleepA') }}
      </p>
    </div>
  </div>
  <div
    v-else
    :key="`${trustKey}-record`"
    class="app-trust-slide flex aspect-[2/1] h-auto w-full flex-col overflow-hidden rounded-2xl border border-default bg-elevated p-3 sm:p-4 lg:-translate-x-6"
    data-testid="home-trust-swatch"
    data-trust-frame="record"
    aria-hidden="true"
  >
    <div class="mb-2 flex items-center justify-between gap-2">
      <p class="text-sm font-semibold text-highlighted">
        {{ $t('labChart.dockTitle') }}
      </p>
    </div>
    <ReportResultLegend />
    <div class="mt-2 min-h-0 flex-1 overflow-hidden">
      <ReportResultCards
        :results="recordRows"
        position="gauge"
        hide-scrollbar
      />
    </div>
  </div>
</template>
