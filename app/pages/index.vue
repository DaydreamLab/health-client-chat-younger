<template>
  <div>
    <section class="app-hero relative isolate -mt-16 min-h-dvh overflow-hidden">
      <div class="app-hero-frame relative min-h-dvh">
        <img
          src="/hero-banner.png"
          alt=""
          class="absolute inset-0 size-full object-cover object-[left_top] sm:object-center"
        >
        <div
          class="app-hero-shade pointer-events-none absolute inset-0"
          aria-hidden="true"
        />
        <div class="relative flex min-h-dvh items-end px-4 py-10 sm:absolute sm:inset-0 sm:min-h-0 sm:items-center sm:justify-end sm:px-6 sm:py-16">
          <div class="app-hero-copy w-full max-w-xl text-center text-white">
            <p
              data-testid="brand-hero"
              class="text-lg font-medium tracking-wide"
            >
              <span class="sr-only">{{ $t('hero.eyebrow') }}</span>
              <span
                class="app-hero-cycle"
                aria-hidden="true"
              >
                <span>{{ $t('hero.eyebrowLead') }}</span>
                <span class="app-hero-cycle-dot">·</span>
                <span class="app-hero-cycle-slot">
                  <span
                    v-for="key in eyebrowWordKeys"
                    :key="key"
                    class="app-hero-cycle-word"
                  >{{ $t(`hero.${key}`) }}</span>
                </span>
              </span>
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

    <section
      class="pt-12 pb-6 sm:pt-16 sm:pb-8"
      :aria-label="$t('homeGoals.title')"
      data-testid="home-goals"
    >
      <div class="mx-auto max-w-6xl px-4 sm:px-6">
        <h2 class="text-center text-2xl font-bold text-highlighted sm:text-3xl">
          {{ $t('homeGoals.title') }}
        </h2>
        <p class="mx-auto mt-2 max-w-2xl text-center text-sm text-muted">
          {{ $t('homeGoals.subtitle') }}
        </p>
        <div class="mx-auto mt-6 flex max-w-4xl flex-wrap justify-center gap-2">
          <NuxtLink
            v-for="code in homeGoalCodes"
            :key="code"
            :to="goalChatPath(code)"
            class="app-chip app-home-goal no-underline"
            :class="{ 'app-path-card-selected': code === featuredHomeGoal }"
            :data-testid="`home-goal-${code}`"
          >
            {{ $t(`homeGoals.${code}`) }}
          </NuxtLink>
        </div>
      </div>
    </section>

    <section class="bg-brand-100 dark:bg-brand-900">
      <div class="mx-auto max-w-6xl px-4 pt-10 pb-16 sm:px-6 sm:pt-12 sm:pb-24">
        <h2 class="text-center text-2xl font-bold text-highlighted sm:text-3xl">
          {{ $t('steps.title') }}
        </h2>
        <ol class="app-home-rail mt-8">
          <li
            v-for="(step, index) in stepKeys"
            :key="step"
            class="app-home-rail-step"
          >
            <div class="app-home-rail-mark">
              <span
                class="app-home-rail-dot"
                aria-hidden="true"
              >
                {{ index + 1 }}
              </span>
              <p class="app-home-rail-label text-xs font-medium tracking-wide text-primary">
                {{ $t(`steps.${step}Label`) }}
              </p>
            </div>
            <h3 class="app-home-rail-title text-2xl font-semibold text-highlighted">
              {{ $t(`steps.${step}Title`) }}
            </h3>
            <p class="app-home-rail-hint mt-2 whitespace-pre-line text-sm leading-6 text-muted">
              {{ $t(`steps.${step}Hint`) }}
            </p>
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
          next: 'end-3 sm:end-4',
          dot: 'bg-primary/30 data-[state=active]:bg-primary'
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
      class="scroll-mt-24 bg-brand-100 py-12 dark:bg-brand-900 sm:py-16"
    >
      <div class="mx-auto max-w-6xl px-4 sm:px-6">
        <h2 class="text-2xl font-semibold text-highlighted sm:text-3xl">
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
        <UPricingPlans
          v-else
          :plans="pricingPlans"
          class="mx-auto mt-6 w-full max-w-3xl"
        />
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

    <section
      class="py-12 sm:py-16"
      :aria-label="$t('trust.title')"
      data-testid="home-trust"
    >
      <div class="mx-auto max-w-6xl px-4 sm:px-6">
        <h2 class="text-2xl font-bold text-highlighted sm:text-3xl">
          {{ $t('trust.title') }}
        </h2>
        <div
          class="app-trust-rotator mt-8 grid items-center gap-8 sm:grid-cols-[minmax(22rem,34rem)_minmax(0,1fr)] sm:gap-12 lg:gap-16"
          data-testid="home-trust-slide"
          :data-trust-key="currentTrust.key"
        >
          <img
            :key="currentTrust.key"
            :src="currentTrust.src"
            alt=""
            class="app-trust-slide aspect-[2/1] h-auto w-full rounded-2xl object-cover"
            data-testid="home-trust-swatch"
            aria-hidden="true"
          >
          <ol class="space-y-6">
            <li
              v-for="(item, index) in trustItems"
              :key="item.key"
              class="flex items-stretch gap-3"
              :data-testid="`home-trust-item-${item.key}`"
            >
              <div class="relative w-1 shrink-0">
                <div
                  v-if="index === trustIndex"
                  class="absolute inset-0 overflow-hidden rounded-full bg-brand-100 motion-reduce:hidden dark:bg-brand-800"
                  data-testid="home-trust-progress"
                >
                  <div
                    class="app-trust-progress h-full w-full origin-top bg-brand-600"
                    @animationend="advanceTrust"
                  />
                </div>
              </div>
              <div class="min-w-0">
                <h3
                  class="text-xl font-bold motion-reduce:text-highlighted"
                  :class="index === trustIndex ? 'text-highlighted' : 'text-muted'"
                >
                  {{ $t(`trust.${item.key}Title`) }}
                </h3>
                <p class="mt-1 text-sm leading-6 text-muted">
                  {{ $t(`trust.${item.key}Hint`) }}
                </p>
              </div>
            </li>
          </ol>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import type { PricingPlanProps } from '@nuxt/ui'
import type { PublicPackage } from '~/utils/candor-api'
import { formatTwd } from '~/utils/first-order'

const { t, locale } = useI18n()
const localePath = useLocalePath()
const journey = useJourneyStore()
const candor = useCandorApi()
const stepKeys = ['one', 'two', 'three'] as const
const homeGoalCodes = [
  'sleep',
  'weight_loss',
  'immune_boost',
  'cognitive_function',
  'gastrointestinal'
] as const
const featuredHomeGoal = 'sleep'
const eyebrowWordKeys = ['eyebrowAdvisor', 'eyebrowLabs', 'eyebrowConsult'] as const
const systemKeys = ['nutrition', 'metabolic', 'cardio', 'detox', 'endocrine', 'immune'] as const
const trustItems = [
  { key: 'data', src: '/home/trust-data.png' },
  { key: 'pace', src: '/home/trust-pace.png' },
  { key: 'advisor', src: '/home/trust-advisor.png' },
  { key: 'record', src: '/home/trust-record.png' }
] as const
const trustIndex = ref(0)
const currentTrust = computed(() => trustItems[trustIndex.value] ?? trustItems[0])

function advanceTrust(event: AnimationEvent) {
  if (event.animationName !== 'app-trust-progress') {
    return
  }
  trustIndex.value = (trustIndex.value + 1) % trustItems.length
}
const plansHref = computed(() => `${localePath('/')}#plans`)
const promoSlides = computed(() => [
  { src: '/home/acerola-vitamin-c.png', alt: t('promo.acerola') },
  { src: '/home/seaweed-calcium.png', alt: t('promo.calcium') },
  { src: '/home/floraglo-lutein.png', alt: t('promo.lutein') }
])

const packages = ref<PublicPackage[]>([])
const packagesPending = ref(true)
const packagesError = ref<string | null>(null)
const listPrices: Record<string, number> = {
  basic: 8000,
  advance: 12000
}
const featureKeyGroups: Record<string, readonly string[]> = {
  basic: ['basicFeature1', 'basicFeature2', 'basicFeature3'],
  advance: ['advanceFeature1', 'advanceFeature2', 'advanceFeature3']
}

function packageTitle(pkg: PublicPackage) {
  if (locale.value === 'en' && pkg.name_en) {
    return pkg.name_en
  }
  return pkg.name
}

function chatPath(code: string) {
  return `${localePath('/chat')}?package=${encodeURIComponent(code)}`
}

function goalChatPath(code: string) {
  return `${localePath('/chat')}?goal=${encodeURIComponent(code)}`
}

function selectPackage(code: string) {
  journey.selectedPackageCode = code
}

const pricingPlans = computed<PricingPlanProps[]>(() => packages.value.map((pkg, index) => {
  const recommended = index === packages.value.length - 1
  const listPrice = listPrices[pkg.code]
  const featureKeys = featureKeyGroups[pkg.code]
  return {
    title: packageTitle(pkg),
    description: pkg.description || undefined,
    price: formatTwd(listPrice ?? pkg.price),
    discount: listPrice == null ? undefined : formatTwd(pkg.price),
    billingCycle: t('plans.billingCycle'),
    features: featureKeys?.map(key => t(`plans.${key}`)),
    ui: {
      featureTitle: 'whitespace-normal overflow-visible text-clip text-pretty',
      root: recommended ? 'ring-[3px]' : 'ring-2',
      price: 'order-1',
      discount: 'order-2',
      billing: 'order-3'
    },
    badge: recommended ? t('shop.recommended') : undefined,
    highlight: recommended,
    button: {
      'label': t('plans.cta'),
      'to': chatPath(pkg.code),
      'variant': recommended ? 'solid' : 'outline',
      'onClick': () => selectPackage(pkg.code),
      'data-testid': `package-${pkg.code}`
    } as PricingPlanProps['button']
  }
}))

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
