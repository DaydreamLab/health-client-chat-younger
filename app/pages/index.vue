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

      <div
        class="mt-5 flex flex-wrap gap-2"
        role="tablist"
        :aria-label="$t('nav.plans')"
      >
        <button
          v-for="id in planIds"
          :key="id"
          type="button"
          role="tab"
          class="app-chip"
          :class="{ 'app-path-card-selected': selectedPlan === id }"
          :aria-selected="selectedPlan === id"
          :data-testid="`plan-tab-${id}`"
          @click="selectedPlan = id"
        >
          {{ $t(`plans.${id}`) }}
        </button>
      </div>

      <article class="app-plan-showcase mt-5 md:grid-cols-2">
        <div class="app-plan-visual">
          <div class="app-plan-visual-icon">
            <UIcon
              :name="planMeta[selectedPlan].icon"
              class="size-7"
            />
          </div>
          <div>
            <p class="text-xs font-medium text-primary">
              {{ $t('plans.visualHint') }}
            </p>
            <p class="mt-2 max-w-xs text-lg font-semibold text-highlighted">
              {{ $t(`plans.${selectedPlan}`) }}
            </p>
          </div>
        </div>
        <div class="flex flex-col justify-center p-6 sm:p-8">
          <div class="flex flex-wrap items-center gap-2">
            <h3 class="text-2xl font-semibold text-highlighted">
              {{ $t(`plans.${selectedPlan}`) }}
            </h3>
            <span
              v-if="planMeta[selectedPlan].recommended"
              class="app-badge app-badge-demo"
            >
              {{ $t('plans.recommended') }}
            </span>
          </div>
          <p class="mt-4 text-sm text-muted">
            <span class="font-medium text-highlighted">{{ $t('plans.who') }} · </span>
            {{ $t(`plans.${selectedPlan}Who`) }}
          </p>
          <p class="mt-2 text-sm text-muted">
            <span class="font-medium text-highlighted">{{ $t('plans.gets') }} · </span>
            {{ $t(`plans.${selectedPlan}Gets`) }}
          </p>
          <div class="mt-6">
            <AppButton
              :to="chatPath(selectedPlan)"
              :data-testid="`plan-cta-${selectedPlan}`"
            >
              {{ $t('plans.cta') }}
            </AppButton>
          </div>
        </div>
      </article>

      <div class="mt-6 grid gap-4 lg:grid-cols-3">
        <NuxtLink
          v-for="id in planIds"
          :key="id"
          :to="chatPath(id)"
          class="group rounded-2xl border border-default bg-elevated p-5 transition hover:border-primary/40 hover:shadow-lg"
          :class="{ 'ring-2 ring-primary/30': selectedPlan === id }"
          :data-testid="`plan-${id}`"
          @click="selectedPlan = id"
        >
          <UIcon
            :name="planMeta[id].icon"
            class="size-8 text-primary"
          />
          <div class="mt-3 flex flex-wrap items-center gap-2">
            <h3 class="font-medium text-highlighted">
              {{ $t(`plans.${id}`) }}
            </h3>
            <span
              v-if="planMeta[id].recommended"
              class="app-badge app-badge-demo"
            >
              {{ $t('plans.recommended') }}
            </span>
          </div>
          <p class="mt-2 text-sm text-muted">
            {{ $t(`plans.${id}Who`) }}
          </p>
          <p class="mt-1 text-sm text-dimmed">
            {{ $t(`plans.${id}Gets`) }}
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
import { planIds, planMeta, type PlanId } from '~/utils/plans'

const localePath = useLocalePath()
const selectedPlan = ref<PlanId>('premium')
const stepKeys = ['one', 'two', 'three'] as const
const systemKeys = ['nutrition', 'metabolic', 'cardio', 'detox', 'endocrine', 'immune'] as const

function chatPath(plan: PlanId) {
  return `${localePath('/chat')}?plan=${plan}`
}
</script>
