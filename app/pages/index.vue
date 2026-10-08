<template>
  <div>
    <section class="app-hero relative isolate -mt-16 min-h-dvh overflow-hidden">
      <div class="app-hero-frame relative min-h-dvh">
        <img
          :src="heroSrc"
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
              <AppButton
                v-if="labsHref"
                class="px-8"
                :href="labsHref"
                target="_blank"
                rel="noopener noreferrer"
                variant="outline"
                data-testid="hero-cta-labs"
              >
                {{ $t('hero.ctaLabs') }}
              </AppButton>
            </div>
          </div>
        </div>
      </div>
    </section>

    <section
      class="py-12 sm:py-16"
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
        <div class="app-home-goals mt-6">
          <button
            v-for="code in homeGoalCodes"
            :key="code"
            type="button"
            class="app-home-goal"
            :class="{ 'app-home-goal-active': selectedHomeGoals.includes(code) }"
            :aria-pressed="selectedHomeGoals.includes(code)"
            :data-goal="code"
            :data-testid="`home-goal-${code}`"
            @click="toggleHomeGoal(code)"
          >
            <span class="text-base font-semibold text-highlighted">
              {{ $t(`homeGoals.${code}`) }}
            </span>
            <span class="text-sm leading-5 text-muted">
              {{ $t(`homeGoals.${code}Hint`) }}
            </span>
          </button>
        </div>
        <div class="mt-8 flex justify-center">
          <AppButton
            class="px-8"
            :disabled="selectedHomeGoals.length < 1"
            data-testid="home-goals-cta"
            @click="startGoalsChat"
          >
            {{ $t('hero.ctaChat') }}
          </AppButton>
        </div>
      </div>
    </section>

    <section class="bg-brand-100 dark:bg-brand-900">
      <div class="mx-auto max-w-6xl px-4 pt-10 pb-16 sm:px-6 sm:pt-12 sm:pb-24">
        <h2 class="text-center text-2xl font-bold text-highlighted sm:text-3xl">
          {{ $t('steps.title') }}
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
              {{ $t(`steps.${step}Title`) }}
            </h3>
            <p class="app-home-rail-hint mt-2 whitespace-pre-line text-sm leading-6 text-muted">
              {{ $t(`steps.${step}Hint`) }}
            </p>
            <div
              class="app-home-rail-frame"
              aria-hidden="true"
            >
              <template v-if="step === 'one'">
                <p class="app-home-frame-user">
                  {{ $t('steps.oneFrameUser') }}
                </p>
                <p class="app-home-frame-assistant">
                  {{ $t('steps.oneFrameAssistant') }}
                </p>
              </template>
              <template v-else-if="step === 'two'">
                <p class="app-home-frame-plan">
                  {{ $t('steps.twoFramePlan') }}
                </p>
                <p class="app-home-frame-lock">
                  {{ $t('steps.twoFrameLock') }}
                </p>
              </template>
              <p
                v-else
                class="app-home-frame-status"
              >
                {{ $t('steps.threeFrameStatus') }}
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
            width="3840"
            height="1300"
            class="aspect-[3840/1300] w-full object-cover"
          >
        </NuxtLink>
      </UCarousel>
    </section>

    <HomeReportPreview />

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

    <section
      class="py-12 sm:py-16"
      :aria-label="$t('trust.title')"
      data-testid="home-trust"
    >
      <div class="mx-auto max-w-6xl px-4 sm:px-6">
        <div
          class="app-trust-rotator grid items-center gap-8 lg:grid-cols-2 lg:gap-16"
          data-testid="home-trust-slide"
          :data-trust-key="currentTrust.key"
        >
          <img
            :key="currentTrust.key"
            :src="currentTrust.src"
            alt=""
            class="app-trust-slide aspect-[2/1] h-auto w-full rounded-2xl object-cover lg:-translate-x-6"
            data-testid="home-trust-swatch"
            aria-hidden="true"
          >
          <div>
            <h2 class="text-2xl font-bold text-highlighted sm:text-3xl">
              {{ $t('trust.title') }}
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
      </div>
    </section>

    <section
      class="overflow-hidden bg-brand-100 pt-12 pb-16 dark:bg-brand-900 sm:pt-16 sm:pb-20"
      :aria-label="$t('reviews.title')"
      data-testid="home-reviews"
    >
      <div class="mx-auto max-w-6xl px-4 text-center sm:px-6">
        <h2 class="text-2xl font-bold text-highlighted sm:text-3xl">
          {{ $t('reviews.title') }}
        </h2>
      </div>
      <ul class="sr-only">
        <li
          v-for="key in reviewKeys"
          :key="key"
        >
          {{ $t(`reviews.${key}Goal`) }} {{ $t(`reviews.${key}`) }} {{ $t(`reviews.${key}By`) }}
        </li>
      </ul>
      <UMarquee
        pause-on-hover
        :overlay="false"
        aria-hidden="true"
        :ui="{ root: '[--duration:40s] [--gap:--spacing(3)]', content: '!items-stretch py-4' }"
        class="mt-4"
      >
        <article
          v-for="key in reviewKeys"
          :key="key"
          class="flex w-72 shrink-0 items-start gap-3 self-stretch rounded-2xl border border-default bg-elevated p-4"
        >
          <span
            class="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary"
            aria-hidden="true"
          >
            {{ $t(`reviews.${key}Initial`) }}
          </span>
          <div class="flex min-w-0 flex-1 flex-col self-stretch">
            <p class="text-sm font-medium text-primary">
              {{ $t(`reviews.${key}Goal`) }}
            </p>
            <p class="mt-1 text-base leading-6 text-highlighted">
              {{ $t(`reviews.${key}`) }}
            </p>
            <p class="mt-auto pt-2 text-sm text-muted">
              {{ $t(`reviews.${key}By`) }}
            </p>
          </div>
        </article>
      </UMarquee>
      <div class="flex justify-center px-4">
        <AppButton
          class="px-8"
          :to="localePath('/chat')"
          data-testid="home-reviews-cta"
        >
          {{ $t('hero.ctaChat') }}
        </AppButton>
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
const config = useRuntimeConfig()

function publicAsset(path: string) {
  return `${config.app.baseURL}${path.replace(/^\//, '')}`
}

const heroSrc = publicAsset('hero-banner.png')
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
const eyebrowWordKeys = ['eyebrowAdvisor', 'eyebrowLabs', 'eyebrowConsult'] as const
const reviewKeys = ['one', 'two', 'three', 'four', 'five'] as const
const trustItems = [
  { key: 'data', src: publicAsset('home/trust-data.png') },
  { key: 'pace', src: publicAsset('home/trust-pace.png') },
  { key: 'advisor', src: publicAsset('home/trust-advisor.png') },
  { key: 'record', src: publicAsset('home/trust-record.png') }
] as const
const trustIndex = ref(0)
const currentTrust = computed(() => trustItems[trustIndex.value] ?? trustItems[0])
const stepIndex = ref(0)
const selectedHomeGoals = ref<string[]>([])
const labsHref = ref('')

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

function toggleHomeGoal(code: string) {
  if (selectedHomeGoals.value.includes(code)) {
    selectedHomeGoals.value = selectedHomeGoals.value.filter(item => item !== code)
    return
  }
  selectedHomeGoals.value = [...selectedHomeGoals.value, code]
}

async function startGoalsChat() {
  if (selectedHomeGoals.value.length < 1) {
    return
  }
  const params = new URLSearchParams()
  for (const code of selectedHomeGoals.value) {
    params.append('goal', code)
  }
  await navigateTo(`${localePath('/chat')}?${params.toString()}`)
}

function resolveIndividualTestsUrl(remote: {
  individual_tests_url?: string | null
  items?: Array<{ key: string, url: string }>
}): string {
  const direct = String(remote.individual_tests_url || '').trim()
  if (direct) {
    return direct
  }
  const fromItems = remote.items?.find(item => item.key === 'younger-tests')
  return String(fromItems?.url || '').trim()
}

async function loadLabsHref() {
  const fallback = String(config.public.individualTestsUrl || '').trim()
  try {
    const remote = await candor.getClientConfig()
    // Empty string from API is intentional (hide button); only fall back on fetch failure.
    labsHref.value = resolveIndividualTestsUrl(remote)
  } catch {
    labsHref.value = fallback
  }
}

const plansHref = computed(() => `${localePath('/')}#plans`)
const promoSlides = computed(() => [
  { src: publicAsset('home/hemagenics-iron.jpg'), alt: t('promo.hemagenics') },
  { src: publicAsset('home/iron-glycinate.jpg'), alt: t('promo.glycinate') },
  { src: publicAsset('home/active-b-complex.jpg'), alt: t('promo.bComplex') }
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
  void loadLabsHref()
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
