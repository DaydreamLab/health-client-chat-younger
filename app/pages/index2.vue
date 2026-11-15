<template>
  <div data-testid="index2-page">
    <section class="app-hero relative isolate -mt-16 min-h-dvh overflow-hidden">
      <div class="app-hero-frame relative min-h-dvh">
        <img
          :src="heroSrc"
          alt=""
          width="3840"
          height="2160"
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
              {{ $t('homeV2.hero.eyebrow') }}
            </p>
            <h1 class="mt-3 whitespace-pre-line text-[clamp(1.5rem,calc((100vw-2.5rem)/11),1.875rem)] font-semibold tracking-tight min-[375px]:text-4xl sm:text-5xl">
              {{ $t('homeV2.hero.title') }}
            </h1>
            <!-- eslint-disable vue/no-v-html -->
            <p
              class="mt-4 whitespace-pre-line text-xs text-white/85 min-[375px]:text-sm"
              v-html="renderInline($t('homeV2.hero.description'))"
            />
            <!-- eslint-enable vue/no-v-html -->
            <div class="app-hero-actions mt-7">
              <AppButton
                class="px-4"
                :to="localePath('/chat')"
                data-testid="hero-cta-chat"
              >
                {{ $t('homeV2.hero.ctaChat') }}
              </AppButton>
              <AppButton
                class="px-4"
                :to="plansHref"
                variant="outline"
                data-testid="hero-cta-plans"
              >
                {{ $t('homeV2.hero.ctaPlans') }}
              </AppButton>
            </div>
          </div>
        </div>
      </div>
    </section>

    <section class="bg-brand-100 dark:bg-brand-900">
      <div class="mx-auto max-w-6xl px-4 pt-10 pb-16 sm:px-6 sm:pt-12 sm:pb-24">
        <h2 class="text-center text-2xl font-bold text-highlighted sm:text-3xl">
          {{ $t('homeV2.steps.title') }}
        </h2>
        <ol
          class="app-home-rail mt-8"
          :data-step-key="stepKeys[stepIndex]"
        >
          <li
            v-for="(step, index) in stepKeys"
            :key="step"
            class="app-home-rail-step"
            :class="{ 'app-home-rail-step-active': index === stepIndex }"
          >
            <div class="app-home-rail-mark">
              <span
                class="app-home-rail-dot"
                aria-hidden="true"
              >
                {{ index + 1 }}
              </span>
            </div>
            <h3 class="app-home-rail-title text-2xl font-semibold text-highlighted">
              {{ $t(`homeV2.steps.${step}Title`) }}
            </h3>
            <p class="app-home-rail-hint mt-2 whitespace-pre-line text-sm leading-6 text-muted">
              {{ $t(`homeV2.steps.${step}Hint`) }}
            </p>
            <div
              class="app-home-rail-frame"
              aria-hidden="true"
            >
              <template v-if="step === 'one'">
                <p class="app-home-frame-user">
                  {{ $t('homeV2.steps.oneFrameUser') }}
                </p>
                <p class="app-home-frame-assistant">
                  {{ $t('homeV2.steps.oneFrameAssistant') }}
                </p>
              </template>
              <template v-else-if="step === 'two'">
                <div class="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-muted">
                  <span class="inline-flex items-center gap-1.5">
                    <span
                      class="size-2 shrink-0 rounded-full bg-success"
                      aria-hidden="true"
                    />
                    {{ $t('homeV2.steps.twoFrameOk') }}
                  </span>
                  <span class="inline-flex items-center gap-1.5">
                    <span
                      class="size-2 shrink-0 rounded-full bg-warning"
                      aria-hidden="true"
                    />
                    {{ $t('homeV2.steps.twoFrameWarn') }}
                  </span>
                  <span class="inline-flex items-center gap-1.5">
                    <span
                      class="size-2 shrink-0 rounded-full bg-error"
                      aria-hidden="true"
                    />
                    {{ $t('homeV2.steps.twoFrameAlert') }}
                  </span>
                </div>
              </template>
              <p
                v-else
                class="app-home-frame-status"
              >
                {{ $t('homeV2.steps.threeFrameStatus') }}
              </p>
              <div
                v-if="index === stepIndex"
                class="app-home-step-progress-track motion-reduce:hidden"
                data-testid="home-step-progress"
              >
                <div
                  class="app-home-step-progress"
                  @animationend="advanceStep"
                />
              </div>
            </div>
          </li>
        </ol>
      </div>
    </section>

    <section
      class="pb-12 sm:pb-16"
      :aria-label="$t('homeV2.promo.title')"
    >
      <div class="mx-auto max-w-6xl px-4 pt-8 pb-4 text-center sm:px-6 sm:pt-10">
        <h2 class="text-2xl font-bold text-highlighted sm:text-3xl">
          {{ $t('homeV2.promo.title') }}
        </h2>
        <p class="mx-auto mt-2 max-w-2xl text-sm leading-6 text-muted">
          {{ $t('homeV2.promo.body') }}
        </p>
      </div>
    </section>

    <HomeReportPreview />

    <section
      id="plans"
      class="scroll-mt-24 bg-brand-100 py-12 dark:bg-brand-900 sm:py-16"
      data-testid="index2-plans"
    >
      <div class="mx-auto max-w-6xl px-4 sm:px-6">
        <h2 class="text-center text-2xl font-bold text-highlighted sm:text-3xl">
          {{ $t('homeV2.plans.title') }}
        </h2>

        <p
          v-if="packagesError"
          class="mt-6 text-center text-sm text-error"
          data-testid="packages-error"
        >
          {{ packagesError }}
        </p>
        <p
          v-else-if="packagesPending"
          class="mt-6 text-center text-sm text-muted"
          data-testid="packages-loading"
        >
          {{ $t('homeV2.plans.loading') }}
        </p>
        <UPricingPlans
          v-else
          :plans="pricingPlans"
          class="mx-auto mt-6 w-full max-w-3xl"
          data-testid="index2-pricing-plans"
        />

        <p
          class="mx-auto mt-6 max-w-3xl text-center text-xs leading-5 text-muted"
          data-testid="index2-disclaimer"
        >
          {{ $t('homeV2.plans.disclaimer') }}
        </p>
      </div>
    </section>

    <section
      class="py-12 sm:py-16"
      :aria-label="$t('homeV2.trust.title')"
      data-testid="home-trust"
    >
      <div class="mx-auto max-w-6xl px-4 sm:px-6">
        <div
          class="app-trust-rotator grid items-center gap-8 lg:grid-cols-2 lg:gap-16"
          data-testid="home-trust-slide"
          :data-trust-key="currentTrust.key"
        >
          <HomeTrustSwatch
            :key="currentTrust.key"
            :trust-key="currentTrust.key"
            :src="currentTrust.src"
          />
          <div>
            <h2 class="text-2xl font-bold text-highlighted sm:text-3xl">
              {{ $t('homeV2.trust.title') }}
            </h2>
            <ol class="mt-8 space-y-6">
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
                    {{ $t(`homeV2.trust.${item.key}Title`) }}
                  </h3>
                  <p class="mt-1 text-sm leading-6 text-muted">
                    {{ $t(`homeV2.trust.${item.key}Hint`) }}
                  </p>
                </div>
              </li>
            </ol>
          </div>
        </div>
      </div>
    </section>

    <section
      class="bg-brand-100 py-12 dark:bg-brand-900 sm:py-16"
      data-testid="home-reviews"
    >
      <div class="mx-auto flex max-w-2xl flex-col gap-3 px-4 sm:flex-row sm:px-6">
        <AppButton
          class="w-full px-8 sm:flex-1"
          :to="localePath('/chat')"
          data-testid="home-reviews-cta"
        >
          {{ $t('homeV2.reviews.cta') }}
        </AppButton>
        <AppButton
          class="w-full px-8 sm:flex-1"
          variant="outline"
          :to="plansHref"
          data-testid="home-early-bird-cta"
        >
          {{ $t('homeV2.reviews.ctaPlans') }}
        </AppButton>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import type { PricingPlanProps } from '@nuxt/ui'
import type { PublicPackage } from '~/utils/candor-api'
import { resolveListPrice } from '~/utils/package-plan-display'
import { formatTwd } from '~/utils/first-order'

definePageMeta({
  layout: 'index2'
})

const { t, locale } = useI18n()
const localePath = useLocalePath()
const config = useRuntimeConfig()

useSeoMeta({
  title: () => t('meta.title'),
  description: () => t('homeV2.meta.description'),
  robots: 'noindex, nofollow'
})

function publicAsset(path: string) {
  return `${config.app.baseURL}${path.replace(/^\//, '')}`
}

function renderInline(source: string) {
  return source
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\n/g, '<br>')
}

const heroSrc = publicAsset('hero-banner.jpg')
const journey = useJourneyStore()
const candor = useCandorApi()
const stepKeys = ['one', 'two', 'three'] as const
const planFeatureKeys = ['feature1', 'feature2', 'feature3'] as const
const advisorFeatureKeys = ['advisorFeature1', 'advisorFeature2'] as const

const trustItems = [
  { key: 'data', src: publicAsset('home/trust-data.png') },
  { key: 'pace', src: publicAsset('home/trust-pace.png') },
  { key: 'advisor', src: publicAsset('home/trust-advisor.png') },
  { key: 'record', src: publicAsset('home/trust-record.png') },
  { key: 'wearable', src: publicAsset('home/trust-record.png') }
] as const
const trustIndex = ref(0)
const currentTrust = computed(() => trustItems[trustIndex.value] ?? trustItems[0])
const stepIndex = ref(0)

function advanceTrust(event: AnimationEvent) {
  if (event.animationName !== 'app-trust-progress') {
    return
  }
  trustIndex.value = (trustIndex.value + 1) % trustItems.length
}

function advanceStep(event: AnimationEvent) {
  if (event.animationName !== 'app-home-step-progress') {
    return
  }
  stepIndex.value = (stepIndex.value + 1) % stepKeys.length
}

const plansHref = computed(() => `${localePath('/index2')}#plans`)

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

const pricingPlans = computed<PricingPlanProps[]>(() => {
  const packagePlans = packages.value.map((pkg, index) => {
    const listPrice = resolveListPrice(pkg)
    const highlight = index === 0
    return {
      title: packageTitle(pkg),
      price: formatTwd(listPrice ?? pkg.price),
      discount: listPrice == null ? undefined : formatTwd(pkg.price),
      billingCycle: t('homeV2.plans.billingCycle'),
      features: planFeatureKeys.map(key => t(`homeV2.plans.${key}`)),
      ui: {
        featureTitle: 'whitespace-normal overflow-visible text-clip text-pretty',
        root: highlight ? 'ring-[3px]' : 'ring-2',
        title: 'whitespace-normal text-pretty',
        priceWrapper: 'flex flex-wrap items-baseline gap-1',
        price: 'order-1',
        billing: 'order-2 shrink-0',
        discount: 'order-3',
        billingCycle: 'text-muted text-xs font-medium whitespace-nowrap'
      },
      badge: t('homeV2.plans.earlyBirdBadge'),
      highlight,
      button: {
        'label': t('homeV2.plans.cta'),
        'to': chatPath(pkg.code),
        'variant': highlight ? 'solid' : 'outline',
        'onClick': () => selectPackage(pkg.code),
        'data-testid': `package-${pkg.code}`
      } as PricingPlanProps['button']
    }
  })

  const advisorBilling = t('homeV2.plans.advisorBilling').trim()
  const advisorPlan: PricingPlanProps = {
    title: t('homeV2.plans.advisorTitle'),
    price: t('homeV2.plans.advisorPrice'),
    billingCycle: advisorBilling || undefined,
    features: advisorFeatureKeys.map(key => t(`homeV2.plans.${key}`)),
    ui: {
      featureTitle: 'whitespace-normal overflow-visible text-clip text-pretty',
      root: 'ring-2',
      title: 'whitespace-normal text-pretty',
      priceWrapper: 'flex flex-wrap items-baseline gap-1',
      price: 'order-1',
      billing: 'order-2 shrink-0',
      billingCycle: 'text-muted text-xs font-medium whitespace-nowrap'
    },
    highlight: false,
    button: {
      'label': t('homeV2.plans.advisorCta'),
      'to': localePath('/expert-booking'),
      'variant': 'outline',
      'data-testid': 'package-advisor-booking'
    } as PricingPlanProps['button']
  }

  // Prefer a single early-bird package card + advisor card (aligned width).
  const primary = packagePlans[0]
  return primary ? [primary, advisorPlan] : [advisorPlan]
})

onMounted(async () => {
  packagesPending.value = true
  packagesError.value = null
  try {
    const result = await candor.listPackagePlans()
    packages.value = result.package_plans
  } catch {
    packagesError.value = t('homeV2.plans.loadError')
  } finally {
    packagesPending.value = false
  }
})
</script>
