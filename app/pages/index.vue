<template>
  <div>
    <section class="app-hero relative isolate overflow-hidden">
      <div class="app-hero-frame relative">
        <img
          src="/hero-banner.png"
          alt=""
          class="absolute inset-0 size-full object-cover object-[left_top] sm:object-center"
        >
        <div
          class="app-hero-shade pointer-events-none absolute inset-0"
          aria-hidden="true"
        />
        <div class="relative flex min-h-[34rem] items-end px-4 py-10 sm:absolute sm:inset-0 sm:min-h-0 sm:items-center sm:justify-end sm:px-6 sm:py-16">
          <div class="app-hero-copy w-full max-w-xl text-center text-white">
            <p
              data-testid="brand-hero"
              class="text-xs font-medium tracking-wide min-[375px]:text-sm"
            >
              {{ $t('hero.eyebrow') }}
            </p>
            <h1 class="mt-3 whitespace-pre-line text-[clamp(1.5rem,calc((100vw-2.5rem)/11),1.875rem)] font-semibold tracking-tight min-[375px]:text-4xl sm:text-5xl">
              {{ $t('hero.title') }}
            </h1>
            <p class="mt-4 whitespace-pre-line text-xs text-white/85 min-[375px]:text-sm">
              {{ $t('hero.description') }}
            </p>
            <div class="app-hero-actions mt-7">
              <AppButton
                class="px-8"
                :to="localePath('/chat')"
                data-testid="hero-cta-chat"
              >
                {{ $t('hero.ctaChat') }}
              </AppButton>
              <AppButton
                class="px-8"
                :to="`${localePath('/')}#plans`"
                variant="outline"
                data-testid="hero-cta-plans"
              >
                {{ $t('hero.ctaPlans') }}
              </AppButton>
            </div>
          </div>
        </div>
      </div>
    </section>

    <section class="bg-brand-100 dark:bg-brand-900">
      <div class="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
        <h2 class="text-center text-3xl font-semibold text-highlighted sm:text-4xl">
          {{ $t('steps.title') }}
        </h2>
        <ol class="app-home-rail mt-8">
          <li
            v-for="step in stepKeys"
            :key="step"
            class="app-home-rail-step"
          >
            <span
              class="app-home-rail-dot"
              aria-hidden="true"
            >
              <UIcon
                :name="stepIcons[step]"
                class="size-7 text-primary min-[1100px]:size-12"
              />
            </span>
            <div class="app-home-rail-copy">
              <p class="text-sm font-semibold text-primary">
                {{ $t(`steps.${step}Label`) }}
              </p>
              <h3 class="mt-2 font-medium text-highlighted">
                {{ $t(`steps.${step}Title`) }}
              </h3>
              <p class="mt-1 text-sm text-muted">
                {{ $t(`steps.${step}Hint`) }}
              </p>
            </div>
          </li>
        </ol>
      </div>
    </section>

    <section
      class="pb-16 sm:pb-20"
      :aria-label="$t('promo.label')"
    >
      <UCarousel
        v-slot="{ item }"
        loop
        arrows
        dots
        :autoplay="{ delay: 4000, stopOnMouseEnter: true }"
        :items="promoSlides"
        :prev="{ color: 'neutral', variant: 'solid' }"
        :next="{ color: 'neutral', variant: 'solid' }"
        :ui="{
          item: 'basis-full ps-0',
          container: 'ms-0',
          prev: 'start-3 sm:start-4',
          next: 'end-3 sm:end-4'
        }"
        class="w-full"
        data-testid="home-carousel"
      >
        <NuxtLink
          :to="plansHref"
          class="block"
        >
          <img
            :src="item.src"
            :alt="item.alt"
            width="1024"
            height="346"
            class="aspect-[1024/346] w-full object-cover"
          >
        </NuxtLink>
      </UCarousel>
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

      <p
        v-if="packagesError"
        class="mt-6 text-sm text-error"
        data-testid="packages-error"
      >
        {{ packagesError }}
      </p>
      <p
        v-else-if="packagesPending"
        class="mt-6 text-sm text-muted"
        data-testid="packages-loading"
      >
        {{ $t('plans.loading') }}
      </p>
      <div
        v-else
        class="mt-6 grid gap-4 sm:grid-cols-2"
      >
        <NuxtLink
          v-for="(pkg, index) in packages"
          :key="pkg.code"
          :to="chatPath(pkg.code)"
          class="app-path-card"
          :data-testid="`package-${pkg.code}`"
          @click="selectPackage(pkg.code)"
        >
          <div class="flex flex-wrap items-start justify-between gap-2">
            <div class="flex items-center gap-2">
              <UIcon
                :name="index === packages.length - 1 ? 'i-lucide-sparkles' : 'i-lucide-file-text'"
                class="size-5 text-primary"
              />
              <h3 class="text-lg font-semibold text-highlighted">
                {{ packageTitle(pkg) }}
              </h3>
            </div>
            <span
              v-if="index === packages.length - 1"
              class="app-badge app-badge-demo"
            >
              {{ $t('shop.recommended') }}
            </span>
          </div>
          <p class="mt-3 text-xl font-semibold text-primary">
            {{ $t('shop.perMonth', { price: formatTwd(pkg.price) }) }}
          </p>
          <p
            v-if="pkg.description"
            class="mt-2 text-sm text-muted"
          >
            {{ pkg.description }}
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
import type { PublicPackage } from '~/utils/candor-api'
import { formatTwd } from '~/utils/first-order'

const { t, locale } = useI18n()
const localePath = useLocalePath()
const journey = useJourneyStore()
const candor = useCandorApi()
const stepKeys = ['one', 'two', 'three'] as const
const stepIcons = {
  one: 'i-lucide-users',
  two: 'i-lucide-lock',
  three: 'i-lucide-stethoscope'
} as const
const systemKeys = ['nutrition', 'metabolic', 'cardio', 'detox', 'endocrine', 'immune'] as const
const plansHref = computed(() => `${localePath('/')}#plans`)
const promoSlides = computed(() => [
  { src: '/home/acerola-vitamin-c.png', alt: t('promo.acerola') },
  { src: '/home/seaweed-calcium.png', alt: t('promo.calcium') },
  { src: '/home/floraglo-lutein.png', alt: t('promo.lutein') }
])

const packages = ref<PublicPackage[]>([])
const packagesPending = ref(true)
const packagesError = ref<string | null>(null)

function packageTitle(pkg: PublicPackage) {
  if (locale.value === 'en' && pkg.name_en) {
    return pkg.name_en
  }
  return pkg.name
}

function chatPath(code: string) {
  return `${localePath('/chat')}?package=${encodeURIComponent(code)}`
}

function selectPackage(code: string) {
  journey.selectedPackageCode = code
}

onMounted(async () => {
  packagesPending.value = true
  packagesError.value = null
  try {
    const result = await candor.listPackagePlans()
    packages.value = result.package_plans
  } catch {
    packagesError.value = t('plans.loadError')
  } finally {
    packagesPending.value = false
  }
})
</script>
