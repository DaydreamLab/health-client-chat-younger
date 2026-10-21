<template>
  <div>
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
              {{ $t('hero.eyebrow') }}
            </p>
            <h1 class="mt-3 whitespace-pre-line text-[clamp(1.5rem,calc((100vw-2.5rem)/11),1.875rem)] font-semibold tracking-tight min-[375px]:text-4xl sm:text-5xl">
              {{ $t('hero.title') }}
            </h1>
            <!-- eslint-disable vue/no-v-html -->
            <p
              class="mt-4 whitespace-pre-line text-xs text-white/85 min-[375px]:text-sm"
              v-html="renderInline($t('hero.description'))"
            />
            <!-- eslint-enable vue/no-v-html -->
            <div class="app-hero-actions mt-7">
              <AppButton
                class="px-4"
                :to="localePath('/chat')"
                data-testid="hero-cta-chat"
              >
                {{ $t('hero.ctaChat') }}
              </AppButton>
              <AppButton
                class="px-4"
                :to="localePath('/chat')"
                variant="outline"
                data-testid="hero-cta-upload"
              >
                {{ $t('hero.ctaUpload') }}
              </AppButton>
              <AppButton
                v-if="labsHref"
                class="px-4"
                :href="labsHref"
                target="_blank"
                rel="noopener noreferrer"
                variant="outline"
                data-testid="hero-cta-labs"
              >
                {{ $t('hero.ctaLabs') }}
              </AppButton>
              <AppButton
                v-if="showYoungerLabs"
                class="px-4"
                :href="labsHref || undefined"
                :target="labsHref ? '_blank' : undefined"
                :rel="labsHref ? 'noopener noreferrer' : undefined"
                variant="outline"
                data-testid="hero-cta-younger-labs"
              >
                {{ $t('hero.ctaYoungerLabs') }}
              </AppButton>
              <AppButton
                class="px-4"
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
      class="py-12 sm:py-16"
      :aria-label="$t('homeGoals.title')"
      data-testid="home-goals"
    >
      <div class="mx-auto max-w-6xl px-4 sm:px-6">
        <h2 class="text-center text-2xl font-bold text-highlighted sm:text-3xl">
          {{ $t('homeGoals.title') }}
        </h2>
        <!-- eslint-disable vue/no-v-html -->
        <p
          class="mx-auto mt-2 max-w-2xl text-center text-sm text-muted"
          v-html="renderInline($t('homeGoals.subtitle'))"
        />
        <!-- eslint-enable vue/no-v-html -->
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
        <div class="mt-8 flex flex-wrap justify-center gap-3">
          <AppButton
            class="px-8"
            :disabled="selectedHomeGoals.length < 1"
            data-testid="home-goals-cta"
            @click="startGoalsChat"
          >
            {{ $t('homeGoals.cta') }}
          </AppButton>
          <AppButton
            class="px-8"
            variant="outline"
            :to="localePath('/chat')"
            data-testid="home-goals-cta-upload"
          >
            {{ $t('homeGoals.ctaUpload') }}
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
            <!-- eslint-disable vue/no-v-html -->
            <p
              class="app-home-rail-hint mt-2 whitespace-pre-line text-sm leading-6 text-muted"
              v-html="renderInline($t(`steps.${step}Hint`))"
            />
            <!-- eslint-enable vue/no-v-html -->
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
      v-if="showYoungerLabs"
      class="py-12 sm:py-16"
      :aria-label="$t('youngerLabs.title')"
      data-testid="home-younger-labs"
    >
      <div class="mx-auto max-w-6xl px-4 sm:px-6">
        <h2 class="text-center text-2xl font-bold text-highlighted sm:text-3xl">
          {{ $t('youngerLabs.title') }}
        </h2>
        <!-- eslint-disable vue/no-v-html -->
        <p
          class="mx-auto mt-2 max-w-2xl text-center text-sm text-muted"
          v-html="renderInline($t('youngerLabs.body'))"
        />
        <!-- eslint-enable vue/no-v-html -->
        <div class="mt-8 flex justify-center">
          <AppButton
            class="px-8"
            :href="labsHref || undefined"
            :target="labsHref ? '_blank' : undefined"
            :rel="labsHref ? 'noopener noreferrer' : undefined"
            data-testid="home-younger-labs-cta"
          >
            {{ $t('youngerLabs.cta') }}
          </AppButton>
        </div>
      </div>
    </section>

    <section
      class="pb-12 sm:pb-16"
      :aria-label="$t('promo.title')"
    >
      <div class="mx-auto max-w-6xl px-4 pt-8 pb-4 text-center sm:px-6 sm:pt-10">
        <p class="text-sm font-medium text-primary">
          {{ $t('promo.label') }}
        </p>
        <h2 class="mt-2 text-2xl font-bold text-highlighted sm:text-3xl">
          {{ $t('promo.title') }}
        </h2>
        <p class="mx-auto mt-2 max-w-2xl text-sm leading-6 text-muted">
          {{ $t('promo.body') }}
        </p>
      </div>
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
        <h2 class="text-center text-2xl font-bold text-highlighted sm:text-3xl">
          {{ $t('plans.title') }}
        </h2>
        <div class="mx-auto mt-6 max-w-xl rounded-xl border border-default bg-elevated p-6 text-left">
          <p class="text-lg font-semibold text-highlighted">
            {{ $t('plans.offerName') }}
          </p>
          <p class="mt-1 text-sm text-muted">
            {{ $t('plans.offerPrice') }}
          </p>
          <ul class="mt-4 list-disc space-y-2 ps-5 text-sm leading-6 text-highlighted">
            <li
              v-for="key in planOfferFeatureKeys"
              :key="key"
            >
              {{ $t(`plans.${key}`) }}
            </li>
          </ul>
          <p class="mt-4 text-xs leading-5 text-muted">
            {{ $t('plans.offerNote') }}
          </p>
        </div>

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
                  <!-- eslint-disable vue/no-v-html -->
                  <p
                    class="mt-1 text-sm leading-6 text-muted"
                    v-html="renderInline($t(`trust.${item.key}Hint`))"
                  />
                  <!-- eslint-enable vue/no-v-html -->
                </div>
              </li>
            </ol>
          </div>
        </div>
      </div>
    </section>

    <section
      class="bg-brand-100 dark:bg-brand-900"
      :class="showHomeReviews ? 'overflow-hidden pt-12 pb-16 sm:pt-16 sm:pb-20' : 'py-12 sm:py-16'"
      :aria-label="showHomeReviews ? $t('reviews.title') : undefined"
      data-testid="home-reviews"
    >
      <template v-if="showHomeReviews">
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
      </template>
      <div
        class="mx-auto flex max-w-2xl flex-col gap-3 px-4 sm:flex-row sm:px-6"
        :class="showHomeReviews ? 'mt-8' : undefined"
      >
        <AppButton
          class="w-full px-8 sm:flex-1"
          :to="localePath('/chat')"
          data-testid="home-reviews-cta"
        >
          {{ $t('reviews.cta') }}
        </AppButton>
        <AppButton
          class="w-full px-8 sm:flex-1"
          variant="outline"
          :to="plansHref"
          data-testid="home-early-bird-cta"
        >
          {{ $t('reviews.ctaEarlyBird') }}
        </AppButton>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import type { PricingPlanProps } from '@nuxt/ui'
import type { PublicPackage } from '~/utils/candor-api'
import { resolveListPrice, resolvePlanDescription } from '~/utils/package-plan-display'
import { formatTwd } from '~/utils/first-order'

const { t, locale } = useI18n()
const localePath = useLocalePath()
const config = useRuntimeConfig()

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
const homeGoalCodes = [
  'sleep',
  'weight_loss',
  'immune_boost',
  'cognitive_function',
  'gastrointestinal'
] as const
const reviewKeys = ['one', 'two', 'three', 'four', 'five'] as const
const planOfferFeatureKeys = ['offerFeature1', 'offerFeature2', 'offerFeature3'] as const
// Younger 實體檢測。預設關閉；開啟後才顯示該區與 Banner「預約 Younger 實體血檢」。
const showYoungerLabs = false
// 顧客好評先隱藏，文案保留在 i18n，最底部按鈕仍顯示。
const showHomeReviews = false
const trustItems = [
  // TODO: 待確認 — 第 1 點「業界首創」用詞待團隊確認
  { key: 'data', src: publicAsset('home/trust-data.png') },
  { key: 'pace', src: publicAsset('home/trust-pace.png') },
  { key: 'advisor', src: publicAsset('home/trust-advisor.png') },
  { key: 'record', src: publicAsset('home/trust-record.png') },
  // TODO: 待確認 — 第 5 點穿戴裝置全日健康數據追蹤待團隊確認
  { key: 'wearable', src: publicAsset('home/trust-record.png') }
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
const featureKeyGroups: Record<string, readonly string[]> = {
  basic: ['basicFeature1', 'basicFeature2', 'basicFeature3'],
  advance: ['advanceFeature1', 'advanceFeature2', 'advanceFeature3']
}

function packageHasCatalogFields(pkg: PublicPackage) {
  return 'original_price' in pkg
    || 'features' in pkg
    || 'features_en' in pkg
    || 'badge' in pkg
    || 'badge_en' in pkg
    || 'highlight' in pkg
}

function resolvePlanFeatures(pkg: PublicPackage) {
  const fromApi = locale.value === 'en' ? pkg.features_en : pkg.features
  if (fromApi?.length) {
    return fromApi
  }
  const featureKeys = featureKeyGroups[pkg.code]
  return featureKeys?.map(key => t(`plans.${key}`)) ?? []
}

function resolvePlanBadge(pkg: PublicPackage, recommendedFallback: boolean) {
  if (packageHasCatalogFields(pkg)) {
    const raw = locale.value === 'en' ? pkg.badge_en : pkg.badge
    const text = raw?.trim()
    return text || undefined
  }
  return recommendedFallback ? t('shop.recommended') : undefined
}

function resolvePlanHighlight(pkg: PublicPackage, recommendedFallback: boolean) {
  if (pkg.highlight !== undefined && pkg.highlight !== null) {
    return pkg.highlight
  }
  return recommendedFallback
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
  const recommendedFallback = index === packages.value.length - 1
  const listPrice = resolveListPrice(pkg)
  const highlight = resolvePlanHighlight(pkg, recommendedFallback)
  return {
    title: packageTitle(pkg),
    description: resolvePlanDescription(pkg, locale.value, t),
    price: formatTwd(listPrice ?? pkg.price),
    discount: listPrice == null ? undefined : formatTwd(pkg.price),
    billingCycle: t('plans.billingCycle'),
    features: resolvePlanFeatures(pkg),
    ui: {
      featureTitle: 'whitespace-normal overflow-visible text-clip text-pretty',
      root: highlight ? 'ring-[3px]' : 'ring-2',
      price: 'order-1',
      discount: 'order-2',
      billing: 'order-3'
    },
    badge: resolvePlanBadge(pkg, recommendedFallback),
    highlight,
    button: {
      'label': t('plans.cta'),
      'to': chatPath(pkg.code),
      'variant': highlight ? 'solid' : 'outline',
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
