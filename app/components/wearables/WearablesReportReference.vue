<template>
  <section
    class="rounded-2xl border border-default bg-elevated p-5"
    data-testid="wearables-report-reference"
  >
    <div class="flex flex-wrap items-center gap-2">
      <UIcon
        name="i-lucide-watch"
        class="size-5 text-primary"
        aria-hidden="true"
      />
      <h3 class="font-semibold text-highlighted">
        {{ $t('wearables.reportReference.title') }}
      </h3>
      <WearablesSampleBadge class="ms-auto" />
    </div>
    <ul class="mt-3 space-y-1 text-sm text-muted">
      <li data-testid="wearables-report-ref-sleep">
        {{ $t('wearables.reportReference.avgSleep', { value: sleepLabel }) }}
      </li>
      <li data-testid="wearables-report-ref-hr">
        {{ $t('wearables.reportReference.avgHr', {
          value: reference.avg_resting_hr,
          unit: hrUnit
        }) }}
      </li>
    </ul>
    <AppButton
      class="mt-4"
      variant="outline"
      :to="localePath(`/app/wearables/${reference.device_id}`)"
      data-testid="wearables-report-ref-cta"
    >
      {{ $t('wearables.reportReference.cta') }}
    </AppButton>
    <p class="mt-4 text-xs leading-5 text-muted">
      {{ $t('wearables.disclaimer') }}
    </p>
  </section>
</template>

<script setup lang="ts">
import type { WearableReportReference } from '~/utils/wearables-mock'
import { wearablesReportReferenceMock } from '~/utils/wearables-mock'
import { localizedRestingHrUnit } from '~/utils/wearables-format'

const props = defineProps<{
  reference?: WearableReportReference
}>()

const localePath = useLocalePath()
const { t, locale } = useI18n()
const reference = computed(() => props.reference ?? wearablesReportReferenceMock)

const hrUnit = computed(() => localizedRestingHrUnit(locale.value, t))

const sleepLabel = computed(() => {
  const total = reference.value.avg_sleep_minutes
  const hours = Math.floor(total / 60)
  const minutes = total % 60
  return t('wearables.detail.avgSleep', { hours, minutes })
})
</script>
