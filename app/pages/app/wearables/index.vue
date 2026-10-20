<template>
  <div
    class="mx-auto w-full max-w-2xl space-y-6"
    data-testid="wearables-page"
  >
    <div class="flex flex-wrap items-center gap-2">
      <h1 class="text-2xl font-semibold text-highlighted">
        {{ $t('wearables.pageTitle') }}
      </h1>
      <WearablesSampleBadge class="ms-auto" />
    </div>

    <WearablesDemoStateNav />

    <WearablesReportReference
      v-if="demoView === 'report'"
    />

    <template v-else-if="demoState === 'empty'">
      <section
        class="rounded-2xl border border-default bg-elevated px-6 py-12 text-center"
        data-testid="wearables-empty"
      >
        <UIcon
          name="i-lucide-watch"
          class="mx-auto size-12 text-primary"
          aria-hidden="true"
        />
        <h2 class="mt-4 text-lg font-semibold text-highlighted">
          {{ $t('wearables.empty.title') }}
        </h2>
        <p class="mx-auto mt-2 max-w-sm text-sm leading-6 text-muted">
          {{ $t('wearables.empty.body') }}
        </p>
        <AppButton
          class="mt-6"
          data-testid="wearables-link-device"
        >
          {{ $t('wearables.empty.cta') }}
        </AppButton>
        <p class="mt-6 text-xs text-muted">
          {{ $t('wearables.empty.syncHint') }}
        </p>
      </section>
    </template>

    <template v-else>
      <div
        v-if="errorBanners.length"
        class="space-y-3"
        data-testid="wearables-error-banners"
      >
        <article
          v-for="banner in errorBanners"
          :key="banner.id"
          class="rounded-2xl border border-default bg-elevated p-4"
          :data-testid="banner.testId"
        >
          <p class="font-medium text-highlighted">
            {{ banner.title }}
          </p>
          <p class="mt-1 text-sm text-muted">
            {{ banner.body }}
          </p>
          <p
            v-if="banner.staleNote"
            class="mt-2 text-sm text-muted"
          >
            {{ banner.staleNote }}
          </p>
          <div class="mt-4 flex flex-wrap gap-2">
            <AppButton
              v-for="action in banner.actions"
              :key="action.label"
              :variant="action.primary ? 'primary' : 'outline'"
              :data-testid="action.testId"
            >
              {{ action.label }}
            </AppButton>
          </div>
        </article>
      </div>

      <section
        v-if="demoState === 'no_data'"
        class="rounded-2xl border border-dashed border-default bg-elevated p-5 text-center"
        data-testid="wearables-no-data"
      >
        <p class="font-medium text-highlighted">
          {{ $t('wearables.noData.title') }}
        </p>
        <p class="mt-2 text-sm text-muted">
          {{ $t('wearables.noData.body') }}
        </p>
      </section>

      <ul
        v-if="devices.length"
        class="space-y-3"
        data-testid="wearables-device-list"
      >
        <li
          v-for="device in devices"
          :key="device.id"
          class="rounded-2xl border border-default bg-elevated p-4"
          :data-testid="`wearables-device-${device.id}`"
        >
          <div class="flex flex-wrap items-start justify-between gap-2">
            <div class="min-w-0">
              <AppButton
                variant="ghost"
                class="!h-auto !p-0 text-start font-semibold text-highlighted hover:bg-transparent"
                :to="localePath(`/app/wearables/${device.id}`)"
                :data-testid="`wearables-device-link-${device.id}`"
              >
                {{ deviceLabel(device.display_name) }}
              </AppButton>
              <p class="mt-1 text-sm text-muted">
                {{ $t('wearables.lastSync', { time: formatSyncTime(device.last_synced_at) }) }}
              </p>
              <p
                v-if="device.metrics.length && demoState !== 'no_data'"
                class="mt-1 text-xs text-muted"
              >
                {{ $t('wearables.metricsLine', { metrics: metricsLabel(device.metrics) }) }}
              </p>
            </div>
            <WearablesDeviceStatusBadge :status="device.status" />
          </div>
          <div
            v-if="device.status === 'auth_expired'"
            class="mt-3 flex flex-wrap items-center gap-2"
          >
            <p class="text-sm text-muted">
              {{ $t('wearables.authExpiredInline') }}
            </p>
            <AppButton
              variant="outline"
              data-testid="wearables-reauth-inline"
            >
              {{ $t('wearables.actions.reauthorize') }}
            </AppButton>
          </div>
        </li>
      </ul>

      <AppButton
        class="w-full sm:w-auto"
        variant="outline"
        data-testid="wearables-add-device"
      >
        {{ $t('wearables.addDevice') }}
      </AppButton>

      <p class="text-xs leading-5 text-muted">
        {{ $t('wearables.disclaimer') }}
      </p>
    </template>
  </div>
</template>

<script setup lang="ts">
import {
  WEARABLE_DEMO_STATE_QUERY,
  devicesForDemoState,
  parseWearableDemoState,
  type WearableMetricType
} from '~/utils/wearables-mock'

definePageMeta({
  layout: 'user',
  middleware: 'auth'
})

const route = useRoute()
const localePath = useLocalePath()
const { t, locale } = useI18n()

const demoView = computed(() => {
  const raw = route.query[WEARABLE_DEMO_STATE_QUERY]
  const value = Array.isArray(raw) ? raw[0] : raw
  return value === 'report' ? 'report' : null
})

const demoState = computed(() => {
  const raw = route.query[WEARABLE_DEMO_STATE_QUERY]
  const value = Array.isArray(raw) ? raw[0] : raw
  return parseWearableDemoState(value === 'report' ? null : value)
})

const devices = computed(() => devicesForDemoState(demoState.value))

function deviceLabel(name: string) {
  return t('wearables.deviceNameSample', { name })
}

function metricsLabel(metrics: WearableMetricType[]) {
  return metrics.map(metric => t(`wearables.metrics.${metric}`)).join(locale.value === 'en' ? ', ' : '・')
}

function formatSyncTime(iso: string) {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) {
    return iso
  }
  if (locale.value === 'en') {
    return date.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
  }
  const now = new Date('2026-10-19T12:00:00+08:00')
  const sameDay = date.toDateString() === now.toDateString()
  if (sameDay) {
    return t('wearables.syncToday', {
      time: date.toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit', hour12: false })
    })
  }
  const diffDays = Math.round((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24))
  if (diffDays > 0 && diffDays < 7) {
    return t('wearables.syncDaysAgo', { count: diffDays })
  }
  return date.toLocaleString('zh-TW', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false })
}

const errorBanners = computed(() => {
  if (demoState.value !== 'errors') {
    return []
  }
  const garmin = devices.value.find(device => device.id === 'garmin')
  const oura = devices.value.find(device => device.status === 'sync_error')
  const banners = []
  if (garmin) {
    banners.push({
      id: 'garmin-auth',
      testId: 'wearables-error-auth',
      title: t('wearables.errors.authTitle', { name: deviceLabel(garmin.display_name) }),
      body: t('wearables.errors.authBody', {
        time: formatSyncTime(garmin.last_success_sync_at ?? garmin.last_synced_at)
      }),
      staleNote: t('wearables.errors.staleData'),
      actions: [
        { label: t('wearables.actions.reauthorize'), testId: 'wearables-reauth-banner', primary: true },
        { label: t('wearables.actions.later'), testId: 'wearables-dismiss-auth', primary: false }
      ]
    })
  }
  if (oura) {
    banners.push({
      id: 'oura-sync',
      testId: 'wearables-error-sync',
      title: t('wearables.errors.syncTitle', { name: deviceLabel(oura.display_name) }),
      body: t('wearables.errors.syncBody'),
      staleNote: undefined,
      actions: [
        { label: t('wearables.actions.retryNow'), testId: 'wearables-retry-sync', primary: true }
      ]
    })
  }
  return banners
})
</script>
