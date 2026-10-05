<script setup lang="ts">
import type { HealthReportResult } from '~/utils/candor-api'

const { t } = useI18n()
const showGauge = ref(false)
let timer: ReturnType<typeof setInterval> | undefined

const rows = computed<HealthReportResult[]>(() => [
  {
    id: 'preview-vitamin-d',
    raw_name: t('preview.vitaminD'),
    value_numeric: 22,
    unit: 'ng/mL',
    ref_low: 30,
    ref_high: 100
  },
  {
    id: 'preview-ferritin',
    raw_name: t('preview.ferritin'),
    value_numeric: 18,
    unit: 'ng/mL',
    ref_low: 30,
    ref_high: 400
  },
  {
    id: 'preview-ldl',
    raw_name: t('preview.ldl'),
    value_numeric: 98,
    unit: 'mg/dL',
    ref_low: 50,
    ref_high: 130
  }
])

onMounted(() => {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    return
  }
  timer = setInterval(() => {
    showGauge.value = !showGauge.value
  }, 7000)
})

onUnmounted(() => {
  if (timer != null) {
    clearInterval(timer)
  }
})
</script>

<template>
  <section
    class="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16"
    :aria-label="$t('preview.title')"
    data-testid="home-report-preview"
  >
    <div class="grid items-center gap-8 lg:grid-cols-2 lg:gap-16">
      <div>
        <h2 class="text-2xl font-bold text-highlighted sm:text-3xl">
          {{ $t('preview.title') }}
        </h2>
        <p class="mt-3 max-w-xl text-sm leading-6 text-muted">
          {{ $t('preview.body') }}
        </p>
      </div>
      <div class="rounded-2xl border border-default bg-elevated p-4">
        <ReportResultLegend />
        <div class="home-report-cards mt-3 grid">
          <div
            class="home-report-pane col-start-1 row-start-1"
            :class="showGauge ? 'pointer-events-none opacity-0' : 'opacity-100'"
            :aria-hidden="showGauge || undefined"
            data-testid="home-report-cards"
          >
            <ReportResultCards
              :results="rows"
              position="rail"
            />
          </div>
          <div
            class="home-report-pane col-start-1 row-start-1"
            :class="showGauge ? 'opacity-100' : 'pointer-events-none opacity-0'"
            :aria-hidden="!showGauge || undefined"
            data-testid="home-report-gauge"
          >
            <ReportResultCards
              :results="rows"
              position="gauge"
            />
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.home-report-pane {
  transition: opacity 0.7s ease;
}

.home-report-cards :deep(.grid) {
  grid-template-columns: minmax(0, 1fr);
}

@media (prefers-reduced-motion: reduce) {
  .home-report-pane {
    transition: none;
  }
}
</style>
