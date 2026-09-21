<template>
  <div>
    <section class="mx-auto max-w-6xl px-4 py-12 text-center sm:px-6 sm:py-16">
      <p
        data-testid="brand-hero"
        class="text-sm font-medium text-primary"
      >
        {{ $t('hero.eyebrow') }}
      </p>
      <h1 class="mx-auto mt-3 max-w-4xl whitespace-pre-line text-4xl font-semibold tracking-tight text-highlighted sm:text-5xl">
        {{ $t('hero.title') }}
      </h1>
      <p class="mx-auto mt-4 max-w-3xl whitespace-pre-line text-muted">
        {{ $t('hero.description') }}
      </p>
      <div class="mt-8 flex flex-wrap justify-center gap-3">
        <AppButton
          class="min-w-44 px-8"
          :to="localePath('/chat')"
          data-testid="hero-cta-chat"
        >
          {{ $t('hero.ctaChat') }}
        </AppButton>
        <AppButton
          class="min-w-44 px-8"
          :to="`${localePath('/')}#plans`"
          variant="outline"
          data-testid="hero-cta-plans"
        >
          {{ $t('hero.ctaPlans') }}
        </AppButton>
      </div>
    </section>

    <section class="mx-auto max-w-6xl px-4 pb-12 sm:px-6">
      <h2 class="text-xl font-semibold text-highlighted">
        {{ $t('steps.title') }}
      </h2>
      <ol class="app-home-steps mt-4">
        <template
          v-for="(step, index) in stepKeys"
          :key="step"
        >
          <li class="rounded-2xl border border-default bg-elevated p-5">
            <p class="text-xs font-medium text-primary">
              {{ String(index + 1).padStart(2, '0') }}
            </p>
            <h3 class="mt-2 font-medium text-highlighted">
              {{ $t(`steps.${step}Title`) }}
            </h3>
            <p class="mt-1 text-sm text-muted">
              {{ $t(`steps.${step}Hint`) }}
            </p>
          </li>
          <li
            v-if="index < stepKeys.length - 1"
            class="app-home-step-arrow"
            aria-hidden="true"
          >
            ›
          </li>
        </template>
      </ol>
    </section>

    <section
      id="plans"
      class="mx-auto max-w-6xl scroll-mt-24 px-4 pb-12 sm:px-6"
    >
      <h2 class="text-xl font-semibold text-highlighted">
        {{ $t('plans.title') }}
      </h2>
      <p class="mt-2 max-w-2xl text-sm text-muted">
        {{ $t('plans.subtitle') }}
      </p>

      <div class="mt-6 grid gap-4 sm:grid-cols-2">
        <NuxtLink
          v-for="id in supplementPlanIds"
          :key="id"
          :to="chatPath(id)"
          class="app-path-card"
          :data-testid="`plan-${id}`"
          @click="selectPlan(id)"
        >
          <div class="flex flex-wrap items-start justify-between gap-2">
            <div class="flex items-center gap-2">
              <UIcon
                :name="id === 'fullTune' ? 'i-lucide-sparkles' : 'i-lucide-file-text'"
                class="size-5 text-primary"
              />
              <h3 class="text-lg font-semibold text-highlighted">
                {{ $t(`shop.${id}`) }}
              </h3>
            </div>
            <span
              v-if="id === 'fullTune'"
              class="app-badge app-badge-demo"
            >
              {{ $t('shop.recommended') }}
            </span>
          </div>
          <p class="mt-3 text-xl font-semibold text-primary">
            {{ $t('shop.perMonth', { price: formatTwd(supplementPlans[id].price) }) }}
          </p>
          <p class="mt-2 text-sm text-muted">
            {{ $t(`shop.${id}Hint`, { count: supplementPlans[id].itemIds.length }) }}
          </p>
          <p class="mt-4 text-sm font-medium text-primary">
            {{ $t('plans.cta') }}
          </p>
        </NuxtLink>
      </div>
    </section>

    <section class="mx-auto max-w-6xl px-4 pb-16 sm:px-6">
      <h2 class="text-xl font-semibold text-highlighted">
        {{ $t('systems.title') }}
      </h2>
      <p class="mt-2 max-w-2xl text-sm text-muted">
        {{ $t('systems.subtitle') }}
      </p>
      <div class="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <article
          v-for="key in systemKeys"
          :key="key"
          class="rounded-2xl border border-default bg-elevated p-5"
        >
          <h3 class="font-medium text-highlighted">
            {{ $t(`systems.${key}`) }}
          </h3>
          <p class="mt-2 text-sm text-muted">
            {{ $t(`systems.${key}Hint`) }}
          </p>
        </article>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import {
  formatTwd,
  supplementPlanIds,
  supplementPlans,
  type SupplementPlanId
} from '~/utils/first-order'

const localePath = useLocalePath()
const journey = useJourneyStore()
const stepKeys = ['one', 'two', 'three'] as const
const systemKeys = ['nutrition', 'metabolic', 'cardio', 'detox', 'endocrine', 'immune'] as const

function chatPath(plan: SupplementPlanId) {
  return `${localePath('/chat')}?plan=${plan}`
}

function selectPlan(plan: SupplementPlanId) {
  journey.selectedPlanId = plan
}
</script>
