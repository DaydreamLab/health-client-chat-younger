<template>
  <div class="space-y-6">
    <div class="flex flex-wrap items-center gap-2">
      <h1 class="text-2xl font-semibold text-highlighted">
        {{ $t('member.title') }}
      </h1>
      <span class="app-badge app-badge-demo">
        {{ $t('member.demo') }}
      </span>
    </div>

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
          <p class="absolute inset-0 flex items-center justify-center text-3xl font-semibold tabular-nums text-highlighted">
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
            {{ $t('plans.premium') }}
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
          {{ $t('member.trendTitle') }}
        </h2>
        <p class="mt-1 text-sm text-dimmed">
          {{ $t('member.trendHint') }}
        </p>
        <div class="mt-4">
          <HealthTrendChart />
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

    <section>
      <div class="mb-3">
        <h2 class="font-semibold text-highlighted">
          {{ $t('member.accordionTitle') }}
        </h2>
        <p class="mt-1 text-sm text-dimmed">
          {{ $t('member.accordionHint') }}
        </p>
      </div>
      <HealthMarkerAccordion />
    </section>
  </div>
</template>

<script setup lang="ts">
import { healthAge, healthMarkerCount, healthScore, healthScoreDelta } from '~/utils/health-demo'

definePageMeta({
  layout: 'member',
  middleware: 'auth'
})

const ringCircumference = 2 * Math.PI * 52
const ringOffset = ringCircumference * (1 - healthScore / 100)
</script>
