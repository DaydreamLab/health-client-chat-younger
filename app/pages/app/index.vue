<template>
  <div class="space-y-6">
    <div class="flex flex-wrap items-center gap-2">
      <h1 class="text-2xl font-semibold text-highlighted">
        {{ $t('member.title') }}
      </h1>
      <span class="app-badge app-badge-demo">
        {{ $t('member.demo') }}
      </span>
      <AppButton
        :to="localePath('/app/recommendations')"
        variant="primary"
        class="ms-auto"
      >
        {{ $t('chat.viewRecommend') }}
      </AppButton>
    </div>

    <section
      class="rounded-2xl border border-default bg-elevated p-5"
      data-testid="member-privacy"
    >
      <h2 class="font-semibold text-highlighted">
        {{ $t('member.privacyTitle') }}
      </h2>
      <p class="mt-1 text-sm text-muted">
        {{ $t('member.privacyHint') }}
      </p>
      <div
        v-if="!anonymizeOpen"
        class="mt-4"
      >
        <AppButton
          variant="outline"
          data-testid="member-anonymize"
          @click="anonymizeOpen = true"
        >
          {{ $t('member.anonymize') }}
        </AppButton>
      </div>
      <div
        v-else
        class="mt-4 space-y-3"
        data-testid="member-anonymize-panel"
      >
        <p class="text-sm text-highlighted">
          {{ $t('member.anonymizeConfirm') }}
        </p>
        <div class="flex flex-wrap gap-2">
          <AppButton
            data-testid="member-anonymize-confirm"
            :disabled="anonymizePending"
            @click="onAnonymize"
          >
            {{ $t('member.anonymizeConfirmAction') }}
          </AppButton>
          <AppButton
            variant="ghost"
            :disabled="anonymizePending"
            @click="anonymizeOpen = false"
          >
            {{ $t('member.anonymizeDismiss') }}
          </AppButton>
        </div>
        <p
          v-if="anonymizeError"
          class="text-sm text-red-600 dark:text-red-400"
          data-testid="member-anonymize-error"
        >
          {{ anonymizeError }}
        </p>
      </div>
    </section>

    <section
      class="relative overflow-hidden rounded-xl bg-primary/10"
      data-testid="health-ai-summary"
    >
      <span class="absolute inset-y-0 start-0 w-1.5 bg-primary" />
      <div class="px-5 py-4 ps-6">
        <h2 class="text-sm font-medium text-primary">
          {{ $t('member.aiTitle') }}
        </h2>
        <p class="mt-2 text-sm leading-6 text-default">
          {{ aiSummary }}
        </p>
      </div>
    </section>

    <section class="grid gap-4 lg:grid-cols-[minmax(0,18rem)_1fr]">
      <article
        class="flex items-center gap-4 rounded-2xl border border-default bg-elevated p-5"
        data-testid="health-score"
      >
        <div class="relative size-28 shrink-0">
          <svg
            class="app-health-ring size-28"
            viewBox="0 0 120 120"
          >
            <circle
              class="app-health-ring-track"
              cx="60"
              cy="60"
              r="52"
              stroke-width="10"
            />
            <circle
              class="app-health-ring-value"
              cx="60"
              cy="60"
              r="52"
              stroke-width="10"
              :stroke-dasharray="ringCircumference"
              :stroke-dashoffset="ringOffset"
            />
          </svg>
          <p class="absolute inset-0 flex items-center justify-center text-3xl font-bold tabular-nums text-primary">
            <CountUpNumber :value="healthScore" />
          </p>
        </div>
        <div>
          <p class="text-sm text-muted">
            {{ $t('member.scoreLabel') }}
          </p>
          <p class="mt-1 text-sm text-dimmed">
            {{ $t('member.scoreHint', { delta: healthScoreDelta }) }}
          </p>
        </div>
      </article>

      <div class="grid gap-4 sm:grid-cols-3">
        <article class="rounded-2xl border border-default bg-elevated p-5">
          <p class="text-sm text-muted">
            {{ $t('member.ageLabel') }}
          </p>
          <p class="mt-2 text-2xl font-semibold tabular-nums text-highlighted">
            {{ $t('member.ageValue', { bio: healthAge.biological }) }}
          </p>
          <p class="mt-1 text-sm text-dimmed">
            {{ $t('member.ageHint', { actual: healthAge.actual }) }}
          </p>
        </article>
        <article
          class="rounded-2xl border border-default bg-elevated p-5"
          data-testid="health-stat-markers"
        >
          <p class="text-sm text-muted">
            {{ $t('member.markersCount') }}
          </p>
          <p class="mt-2 text-2xl font-semibold tabular-nums text-highlighted">
            <CountUpNumber :value="healthMarkerCount" />+
          </p>
          <p class="mt-1 text-sm text-dimmed">
            {{ $t('shop.advancePlan') }}
          </p>
        </article>
        <article class="rounded-2xl border border-default bg-elevated p-5">
          <p class="text-sm text-muted">
            {{ $t('member.lastTest') }}
          </p>
          <p class="mt-2 text-xl font-semibold text-highlighted">
            {{ $t('member.lastTestValue') }}
          </p>
          <p class="mt-1 text-sm text-dimmed">
            {{ $t('member.nextCheck') }} · {{ $t('member.nextCheckValue') }}
          </p>
        </article>
      </div>
    </section>

    <section class="grid gap-4 lg:grid-cols-2">
      <article class="rounded-2xl border border-default bg-elevated p-5">
        <h2 class="font-semibold text-highlighted">
          {{ $t('labChart.title') }}
        </h2>
        <p class="mt-1 text-sm text-dimmed">
          {{ $t('labChart.hint') }}
        </p>
        <div class="mt-4">
          <LabBarChart />
        </div>
      </article>
      <article class="rounded-2xl border border-default bg-elevated p-5">
        <h2 class="font-semibold text-highlighted">
          {{ $t('member.pieTitle') }}
        </h2>
        <p class="mt-1 text-sm text-dimmed">
          {{ $t('member.pieHint') }}
        </p>
        <div class="mt-4">
          <HealthSystemPie />
        </div>
      </article>
    </section>

    <section data-testid="health-abnormal">
      <h2 class="mb-3 font-semibold text-highlighted">
        {{ $t('member.abnormalTitle') }}
      </h2>
      <div class="rounded-md bg-error/10 p-4">
        <HealthMarkerList
          :markers="abnormalHealthMarkers"
          tone="abnormal"
        />
      </div>
    </section>

    <section data-testid="health-all-labs">
      <h2 class="mb-3 font-semibold text-highlighted">
        {{ $t('member.allLabsTitle') }}
      </h2>
      <div class="rounded-md bg-muted p-4">
        <HealthMarkerList
          :markers="allHealthMarkers"
          tone="all"
        />
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { demoReportSummary } from '~/utils/first-order'
import {
  abnormalHealthMarkers,
  allHealthMarkers,
  healthAge,
  healthMarkerCount,
  healthScore,
  healthScoreDelta
} from '~/utils/health-demo'

definePageMeta({
  layout: 'user',
  middleware: 'auth'
})

const localePath = useLocalePath()
const { locale, t } = useI18n()
const auth = useAuthStore()
const journey = useJourneyStore()
const ordersStore = useOrdersStore()
const candor = useCandorApi()
const aiSummary = computed(() => demoReportSummary(locale.value))
const ringCircumference = 2 * Math.PI * 52
const ringOffset = ringCircumference * (1 - healthScore / 100)

const anonymizeOpen = ref(false)
const anonymizePending = ref(false)
const anonymizeError = ref('')

async function onAnonymize() {
  if (anonymizePending.value) {
    return
  }
  anonymizePending.value = true
  anonymizeError.value = ''
  try {
    await candor.anonymizeMe()
    journey.clearSession()
    ordersStore.clear()
    auth.logout()
    await navigateTo(localePath('/'))
  } catch {
    anonymizeError.value = t('member.anonymizeError')
  } finally {
    anonymizePending.value = false
  }
}
</script>
