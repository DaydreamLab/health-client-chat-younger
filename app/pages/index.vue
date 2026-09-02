<template>
  <div>
    <section class="mx-auto max-w-6xl px-4 py-16 sm:px-6">
      <p
        data-testid="brand-hero"
        class="text-sm font-medium text-primary"
      >
        {{ $t('brand') }}
      </p>
      <h1 class="mt-3 max-w-3xl text-4xl font-semibold tracking-tight text-highlighted">
        {{ $t('hero.title') }}
      </h1>
      <p class="mt-4 max-w-2xl text-muted">
        {{ $t('hero.description') }}
      </p>
      <div class="mt-8 flex flex-wrap gap-3">
        <AppButton
          href="#plans"
          variant="primary"
        >
          {{ $t('hero.ctaPlans') }}
        </AppButton>
        <AppButton
          :to="localePath('/app/handoff')"
          variant="outline"
        >
          {{ $t('hero.ctaHandoff') }}
        </AppButton>
      </div>
    </section>

    <section class="mx-auto max-w-6xl px-4 pb-12 sm:px-6">
      <h2 class="text-xl font-semibold text-highlighted">
        {{ $t('paths.title') }}
      </h2>
      <div class="mt-4 grid gap-4 md:grid-cols-2">
        <article class="rounded-xl border border-default bg-elevated p-5">
          <h3 class="font-medium text-highlighted">
            {{ $t('paths.withReport') }}
          </h3>
          <p class="mt-2 text-sm text-muted">
            {{ $t('paths.withReportHint') }}
          </p>
        </article>
        <article class="rounded-xl border border-default bg-elevated p-5">
          <h3 class="font-medium text-highlighted">
            {{ $t('paths.withoutReport') }}
          </h3>
          <p class="mt-2 text-sm text-muted">
            {{ $t('paths.withoutReportHint') }}
          </p>
        </article>
      </div>
    </section>

    <section
      id="plans"
      class="mx-auto max-w-6xl scroll-mt-24 px-4 pb-16 sm:px-6"
    >
      <h2 class="text-xl font-semibold text-highlighted">
        {{ $t('plans.title') }}
      </h2>
      <div class="mt-4 grid gap-4 md:grid-cols-3">
        <article
          v-for="row in planRows"
          :key="row.name"
          class="rounded-xl border border-default bg-elevated p-5"
        >
          <h3 class="font-medium text-highlighted">
            {{ row.name }}
          </h3>
          <p class="mt-2 text-sm text-muted">
            {{ row.who }}
          </p>
          <p class="mt-1 text-sm text-dimmed">
            {{ row.gets }}
          </p>
        </article>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
const localePath = useLocalePath()
const { t } = useI18n()

const planRows = computed(() => [{
  name: t('plans.basic'),
  who: t('plans.basicWho'),
  gets: t('plans.basicGets')
}, {
  name: t('plans.mid'),
  who: t('plans.midWho'),
  gets: t('plans.midGets')
}, {
  name: t('plans.premium'),
  who: t('plans.premiumWho'),
  gets: t('plans.premiumGets')
}])
</script>
