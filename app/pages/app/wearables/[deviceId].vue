<template>
  <div
    v-if="device"
    class="mx-auto w-full max-w-2xl space-y-6"
    data-testid="wearables-detail"
  >
    <div class="flex flex-wrap items-center gap-2">
      <AppButton
        variant="ghost"
        class="!px-2"
        :to="localePath('/app/wearables')"
        data-testid="wearables-detail-back"
      >
        <UIcon
          name="i-lucide-chevron-left"
          class="size-4"
        />
        {{ deviceLabel(device.display_name) }}
      </AppButton>
      <WearablesSampleBadge class="ms-auto" />
    </div>

    <div class="flex flex-wrap items-center justify-between gap-3">
      <div
        class="app-wearables-segment flex flex-wrap gap-1"
        role="tablist"
        :aria-label="$t('wearables.metricTabs.label')"
      >
        <AppButton
          v-for="metric in metricOptions"
          :key="metric"
          class="!px-3 !py-1 text-sm"
          :variant="selectedMetric === metric ? 'primary' : 'segment'"
          role="tab"
          :aria-selected="selectedMetric === metric"
          :data-testid="`wearables-metric-${metric}`"
          @click="setSelectedMetric(metric)"
        >
          {{ $t(`wearables.metrics.${metric}`) }}
        </AppButton>
      </div>
      <div
        class="flex gap-1 rounded-xl border border-default p-1"
        role="group"
        :aria-label="$t('wearables.range.label')"
      >
        <AppButton
          v-for="range in rangeOptions"
          :key="range"
          class="!px-3 !py-1 text-sm"
          :variant="selectedRange === range ? 'primary' : 'ghost'"
          :data-testid="`wearables-range-${range}`"
          @click="selectedRange = range"
        >
          {{ $t('wearables.range.days', { count: range }) }}
        </AppButton>
      </div>
    </div>

    <section
      v-if="summary && hasTrendData"
      class="rounded-2xl border border-default bg-elevated p-5"
    >
      <div class="flex flex-wrap items-baseline gap-2">
        <h2 class="text-lg font-semibold text-highlighted">
          {{ metricTitle }}
        </h2>
        <span class="text-sm text-muted">
          {{ $t('wearables.sampleData') }}
        </span>
      </div>
      <p
        class="mt-2 text-2xl font-semibold text-highlighted"
        data-testid="wearables-metric-average"
      >
        {{ formattedAverage }}
      </p>
      <HealthTrendChart
        class="mt-4"
        :points="summary.trend"
        :metric-type="selectedMetric"
        :aria-label="metricTitle"
      />
      <p
        class="mt-4 text-sm text-muted"
        data-testid="wearables-secondary-averages"
      >
        {{ secondaryAverages }}
      </p>
      <p
        class="mt-2 text-sm text-muted"
        data-testid="wearables-last-updated"
      >
        {{ $t('wearables.lastUpdated', { time: formatSyncTime(summary.last_updated_at) }) }}
      </p>
      <AppButton
        class="mt-4"
        variant="outline"
        :to="localePath('/app')"
        data-testid="wearables-view-report"
      >
        {{ $t('wearables.detail.reportCta') }}
      </AppButton>
    </section>

    <section
      v-else
      class="rounded-2xl border border-dashed border-default bg-elevated p-8 text-center"
      data-testid="wearables-detail-no-data"
    >
      <p class="font-medium text-highlighted">
        {{ $t('wearables.noData.title') }}
      </p>
      <p class="mt-2 text-sm text-muted">
        {{ $t('wearables.noData.body') }}
      </p>
    </section>

    <p class="text-xs leading-5 text-muted">
      {{ $t('wearables.disclaimer') }}
    </p>
  </div>

  <div
    v-else
    class="mx-auto max-w-2xl rounded-2xl border border-default bg-elevated p-8 text-center"
    data-testid="wearables-device-missing"
  >
    <p class="text-muted">
      {{ $t('wearables.deviceNotFound') }}
    </p>
    <AppButton
      class="mt-4"
      :to="localePath('/app/wearables')"
    >
      {{ $t('wearables.backToList') }}
    </AppButton>
  </div>
</template>

<script setup lang="ts">
import {
  getWearableDevice,
  getWearableMetricSummary,
  type WearableMetricType
} from '~/utils/wearables-mock'
import { formatSleepDurationMinutes } from '~/utils/wearables-format'

definePageMeta({
  layout: 'user',
  middleware: 'auth'
})

const route = useRoute()
const localePath = useLocalePath()
const { t, locale } = useI18n()

const deviceId = computed(() => String(route.params.deviceId ?? ''))
const demoNoData = computed(() => route.query.demo === 'no_data')

const device = computed(() => getWearableDevice(deviceId.value))

const metricOptions: WearableMetricType[] = ['resting_hr', 'steps', 'sleep_minutes']
const rangeOptions = [7, 30] as const

function parseWearableMetricQuery(raw: unknown): WearableMetricType | null {
  const value = Array.isArray(raw) ? raw[0] : raw
  if (value === 'resting_hr' || value === 'steps' || value === 'sleep_minutes') {
    return value
  }
  return null
}

const selectedMetric = ref<WearableMetricType>(parseWearableMetricQuery(route.query.metric) ?? 'resting_hr')
const selectedRange = ref<7 | 30>(7)

watch(
  () => route.query.metric,
  (raw) => {
    const parsed = parseWearableMetricQuery(raw)
    if (parsed && parsed !== selectedMetric.value) {
      selectedMetric.value = parsed
    }
  }
)

function setSelectedMetric(metric: WearableMetricType) {
  selectedMetric.value = metric
  navigateTo({
    path: route.path,
    query: { ...route.query, metric }
  }, { replace: true })
}

const summary = computed(() => {
  if (!device.value) {
    return null
  }
  return getWearableMetricSummary(device.value.id, selectedMetric.value, selectedRange.value)
})

const hasTrendData = computed(() => !demoNoData.value && Boolean(summary.value?.trend.length))

function deviceLabel(name: string) {
  return t('wearables.deviceNameSample', { name })
}

const metricTitle = computed(() => {
  if (selectedMetric.value === 'resting_hr') {
    return t('wearables.detail.restingHrTitle')
  }
  if (selectedMetric.value === 'steps') {
    return t('wearables.detail.stepsTitle')
  }
  return t('wearables.detail.sleepTitle')
})

const formattedAverage = computed(() => {
  if (!summary.value) {
    return ''
  }
  if (selectedMetric.value === 'resting_hr') {
    return t('wearables.detail.avgBpm', { value: summary.value.average })
  }
  if (selectedMetric.value === 'steps') {
    return t('wearables.detail.avgSteps', { value: summary.value.average.toLocaleString(locale.value) })
  }
  return t('wearables.detail.avgSleep', {
    value: formatSleepDurationMinutes(summary.value.average, t)
  })
})

const secondaryAverages = computed(() => {
  if (!device.value || selectedMetric.value !== 'resting_hr' || selectedRange.value !== 7) {
    return ''
  }
  const steps = getWearableMetricSummary(device.value.id, 'steps', 7)
  const sleep = getWearableMetricSummary(device.value.id, 'sleep_minutes', 7)
  if (!steps || !sleep) {
    return ''
  }
  return t('wearables.detail.secondaryLine', {
    steps: steps.average.toLocaleString(locale.value),
    sleep: formatSleepDurationMinutes(sleep.average, t)
  })
})

function formatSyncTime(iso: string) {
  const date = new Date(iso)
  if (locale.value === 'en') {
    return date.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
  }
  return t('wearables.syncToday', {
    time: date.toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit', hour12: false })
  })
}
</script>
