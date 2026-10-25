<template>
  <div
    class="w-full space-y-6"
    data-testid="wearables-page"
  >
    <div class="flex flex-wrap items-center gap-2">
      <h1 class="text-2xl font-semibold text-highlighted">
        {{ $t('wearables.pageTitle') }}
      </h1>
      <WearablesComingSoonBadge />
    </div>

    <WearablesPreviewBanner />

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
          class="mt-6 min-h-11 w-full sm:w-auto"
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
          class="rounded-2xl border border-default bg-elevated transition-colors hover:border-primary/40"
          :data-testid="`wearables-device-${device.id}`"
        >
          <NuxtLink
            :to="localePath(`/app/wearables/${device.id}`)"
            class="flex gap-3.5 p-4"
            :data-testid="`wearables-device-link-${device.id}`"
          >
            <div
              class="grid size-11 shrink-0 place-items-center rounded-full bg-primary/15 text-primary"
              aria-hidden="true"
            >
              <UIcon
                :name="deviceIcon(device.id)"
                class="size-5"
              />
            </div>
            <div class="min-w-0 flex-1">
              <div class="flex flex-wrap items-center gap-2">
                <span class="font-semibold text-highlighted">
                  {{ device.display_name }}
                </span>
                <WearablesSampleChip />
                <WearablesDeviceStatusBadge
                  class="ms-auto max-sm:ms-0"
                  :status="device.status"
                />
              </div>
              <p class="mt-1 text-sm text-muted">
                {{ $t('wearables.lastSync', { time: formatSyncTime(device.last_synced_at) }) }}
              </p>
              <div
                v-if="device.metrics.length && demoState !== 'no_data'"
                class="mt-2 flex flex-wrap gap-1.5"
              >
                <span
                  v-for="metric in device.metrics"
                  :key="metric"
                  class="rounded-full bg-muted px-2 py-0.5 text-[11px] font-semibold text-muted"
                >
                  {{ $t(`wearables.metrics.${metric}`) }}
                </span>
              </div>
            </div>
          </NuxtLink>
          <div
            v-if="device.status === 'auth_expired'"
            class="flex flex-wrap items-center gap-2 border-t border-default px-4 py-3 ps-[4.25rem] text-xs text-error"
          >
            <p>
              {{ $t('wearables.authExpiredInline') }}
            </p>
            <AppButton
              variant="outline"
              class="!h-9 !border-error !px-3 !text-xs !text-error hover:!bg-error/5"
              data-testid="wearables-reauth-inline"
            >
              {{ $t('wearables.actions.reauthorize') }}
            </AppButton>
          </div>
        </li>
      </ul>

      <AppButton
        class="min-h-11 w-full sm:w-auto"
        variant="outline"
        data-testid="wearables-add-device"
      >
        {{ $t('wearables.addDevice') }}
      </AppButton>

      <p class="text-center text-xs leading-5 text-dimmed">
        {{ $t('wearables.disclaimer') }}
      </p>
    </template>

    <WearablesDemoStateNav />
  </div>
</template>

<script setup lang="ts">
import {
  WEARABLE_DEMO_STATE_QUERY,
  devicesForDemoState,
  parseWearableDemoState
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

function deviceIcon(deviceId: string) {
  if (deviceId.includes('oura')) {
    return 'i-lucide-circle-dot'
  }
  return 'i-lucide-watch'
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
      title: t('wearables.errors.authTitle', { name: garmin.display_name }),
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
      title: t('wearables.errors.syncTitle', { name: oura.display_name }),
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
