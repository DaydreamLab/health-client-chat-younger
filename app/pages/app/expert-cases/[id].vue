<template>
  <div class="space-y-6 pb-24">
    <MemberLoadingState
      v-if="loading"
      :message="$t('recommendation.recoLoading')"
      test-id="expert-case-loading"
    />
    <MemberErrorState
      v-else-if="loadError"
      :message="loadError"
      test-id="expert-case-error"
      retry-test-id="expert-case-retry"
      @retry="loadCase"
    />
    <template v-else>
      <section
        v-if="awaitingReview"
        class="rounded-2xl border border-default bg-elevated p-5"
        data-testid="expert-case-awaiting"
      >
        <h1 class="text-xl font-semibold text-highlighted">
          {{ $t('recommendation.awaitingTitle') }}
        </h1>
        <p class="mt-2 text-sm text-muted">
          {{ $t('recommendation.awaitingBody') }}
        </p>
        <AppButton
          class="mt-6"
          :to="localePath('/app')"
          variant="outline"
          data-testid="expert-case-back-health"
        >
          {{ $t('recommendation.gateBackHealth') }}
        </AppButton>
      </section>

      <template v-else-if="reviewed">
        <section
          class="rounded-2xl border border-default bg-elevated p-5"
          data-testid="expert-plan-result"
        >
          <h1 class="text-xl font-semibold text-highlighted">
            {{ $t('recommendation.readyTitle') }}
          </h1>
          <p
            class="mt-2 text-sm text-muted"
            data-testid="expert-plan-result-readonly-hint"
          >
            {{ $t('expertPlans.resultReadonlyHint') }}
          </p>
          <AppButton
            v-if="orderId"
            class="mt-6"
            :to="localePath(`/app/orders/${orderId}`)"
            data-testid="expert-plan-view-order"
          >
            {{ $t('expertPlans.openOrder') }}
          </AppButton>
        </section>

        <section
          v-if="packages.length"
          class="rounded-2xl border border-default bg-elevated p-5"
        >
          <h2 class="text-xl font-semibold text-highlighted">
            {{ $t('recommendation.packagePick') }}
          </h2>
          <div class="mt-4 grid gap-3 sm:grid-cols-2">
            <label
              v-for="pkg in packages"
              :key="pkg.package_plan_code"
              class="app-path-card pointer-events-none"
              :class="{
                'app-path-card-selected': selectedPackageCode === pkg.package_plan_code
              }"
              :data-testid="`package-plan-${pkg.package_plan_code}`"
            >
              <input
                v-model="selectedPackageCode"
                type="radio"
                class="sr-only"
                name="expert-case-package-plan"
                :value="pkg.package_plan_code"
                disabled
              >
              <div class="flex items-start justify-between gap-2">
                <p class="font-medium text-highlighted">
                  {{ pkg.package_plan_name }}
                </p>
              </div>
              <p
                v-if="openingAmount != null"
                class="mt-2 text-lg font-semibold text-primary"
                data-testid="expert-plan-result-total"
              >
                {{ formatTwd(openingAmount) }}
              </p>
              <p
                v-else
                class="mt-2 text-lg font-semibold text-primary"
              >
                {{ $t('recommendation.perMonth', { price: formatTwd(pkg.price) }) }}
              </p>
              <p class="mt-1 text-sm text-muted">
                {{ $t('recommendation.itemCountHint', { count: pkg.items.length }) }}
              </p>
            </label>
          </div>
        </section>

        <section
          v-if="selectedRationale"
          class="overflow-hidden rounded-2xl border border-default bg-elevated"
          data-testid="package-rationale"
        >
          <div class="border-b border-default px-5 py-4">
            <h2 class="font-semibold text-highlighted">
              {{ selectedRationale.headline || $t('recommendation.rationaleTitle') }}
            </h2>
          </div>
          <div
            class="px-5 py-4 space-y-4"
            data-testid="rationale-body"
          >
            <p
              v-if="selectedRationale.body"
              class="text-sm text-muted whitespace-pre-wrap leading-relaxed"
            >
              {{ selectedRationale.body }}
            </p>
          </div>
        </section>

        <section
          v-if="selectedPackage"
          class="overflow-hidden rounded-2xl border border-default bg-elevated"
          data-testid="package-items"
        >
          <div class="border-b border-default px-5 py-4">
            <h2 class="font-semibold text-highlighted">
              {{ $t('recommendation.itemsTitle') }}
            </h2>
            <p class="mt-1 text-sm text-muted">
              {{ selectedPackage.package_plan_name }}
            </p>
          </div>
          <p
            v-if="!selectedPackage.items.length"
            class="px-5 py-6 text-sm text-muted"
            data-testid="package-items-empty"
          >
            {{ $t('recommendation.itemsEmpty') }}
          </p>
          <ul
            v-else
            class="divide-y divide-default"
          >
            <li
              v-for="item in selectedPackage.items"
              :key="item.sellable_item_id"
              class="flex items-start gap-3 px-5 py-4"
              :data-testid="`sellable-item-${item.code || item.sellable_item_id}`"
            >
              <span class="mt-0.5 size-10 shrink-0 overflow-hidden rounded-xl bg-primary/10 text-primary">
                <img
                  v-if="item.image_url"
                  :src="item.image_url"
                  :alt="item.name || ''"
                  class="size-full object-cover"
                  loading="lazy"
                >
                <span
                  v-else
                  class="flex size-full items-center justify-center"
                >
                  <UIcon
                    name="i-lucide-pill"
                    class="size-5"
                  />
                </span>
              </span>
              <span class="min-w-0 flex-1">
                <span class="flex flex-wrap items-center gap-2">
                  <span class="font-medium text-highlighted">
                    {{ item.name }}
                  </span>
                  <span
                    class="app-badge"
                    :class="item.is_core ? 'app-badge-demo' : 'app-badge-pending'"
                  >
                    {{ item.is_core ? $t('recommendation.itemKindCore') : $t('recommendation.itemKindFunctional') }}
                  </span>
                </span>
              </span>
              <span class="app-badge app-badge-pending shrink-0">
                {{ doseLabel(item) }}
              </span>
            </li>
          </ul>
        </section>
      </template>
    </template>
  </div>
</template>

<script setup lang="ts">
import type {
  FinalizedPlan,
  RecommendationPackage,
  RecommendationPackageItem,
  RecommendationResponse
} from '~/utils/candor-api'
import { CandorApiError } from '~/utils/candor-api'
import { formatTwd } from '~/utils/first-order'
import { recommendationFromExpertReview } from '~/utils/expert-review'

definePageMeta({
  layout: 'user',
  middleware: 'auth'
})

const { t } = useI18n()
const localePath = useLocalePath()
const route = useRoute()
const journey = useJourneyStore()
const candor = useCandorApi()

/** Route param is the case conversation id (GET /conversation/{id}/expert-review). */
const conversationId = computed(() => {
  const raw = route.params.id
  return typeof raw === 'string' ? raw.trim() : ''
})

const loading = ref(true)
const loadError = ref('')
const awaitingReview = ref(false)
const reviewed = ref(false)
const orderId = ref<string | null>(null)
const openingAmount = ref<number | null>(null)
const recommendation = ref<RecommendationResponse | null>(null)
const selectedPackageCode = ref('')

const packages = computed(() => recommendation.value?.packages ?? [])
const selectedPackage = computed(() =>
  packages.value.find(pkg => pkg.package_plan_code === selectedPackageCode.value) ?? null
)
const selectedRationale = computed(() => selectedPackage.value?.rationale ?? null)

function formatDoseCount(value: number): string {
  if (Number.isInteger(value)) {
    return String(value)
  }
  return String(value)
}

function doseLabel(item: RecommendationPackageItem): string {
  return t('recommendation.doseLocked', { count: formatDoseCount(item.daily_dose) })
}

function recommendationFromFinalizedPlan(plan: FinalizedPlan): RecommendationResponse {
  const pkgs: RecommendationPackage[] = (plan.packages ?? []).map((pkg, index) => {
    const code = pkg.package_plan_code?.trim() || `plan-${index}`
    const items: RecommendationPackageItem[] = (pkg.items ?? []).map((item, rank) => ({
      rank: rank + 1,
      sellable_item_id: item.sellable_item_code?.trim() || String(rank),
      code: item.sellable_item_code?.trim() || '',
      name: item.name_zh?.trim() || item.sellable_item_code?.trim() || '',
      daily_dose: item.daily_dose ?? 1,
      is_core: false
    }))
    return {
      package_plan_code: code,
      package_plan_name: pkg.name_zh?.trim() || code,
      price: 0,
      period_days: 30,
      items,
      used_amount: 0,
      remaining: 0,
      composition_hash: ''
    }
  })
  return {
    run_id: '',
    report_id: journey.reportId,
    weight_set: { id: '', version: '' },
    generated_at: new Date().toISOString(),
    copy_mode: '',
    summary: {
      top_domains: [],
      data_gaps: [],
      profile_gaps: [],
      strategy_code: ''
    },
    items: [],
    packages: pkgs
  }
}

function applyPackages(result: RecommendationResponse) {
  recommendation.value = result
  selectedPackageCode.value = result.packages[0]?.package_plan_code ?? ''
}

async function loadFinalizedPlan(id: string) {
  try {
    const finalized = await candor.getFinalizedPlan(id)
    if (!finalized.packages?.length) {
      return false
    }
    applyPackages(recommendationFromFinalizedPlan(finalized))
    return true
  } catch {
    return false
  }
}

async function loadCase() {
  const id = conversationId.value
  if (!id) {
    loadError.value = t('recommendation.recoError')
    loading.value = false
    return
  }

  loading.value = true
  loadError.value = ''
  awaitingReview.value = false
  reviewed.value = false
  orderId.value = null
  openingAmount.value = null
  recommendation.value = null
  selectedPackageCode.value = ''

  try {
    const review = await candor.getExpertReview(id)
    journey.expertReviewStatus = review.status === 'reviewed' ? 'reviewed' : 'awaiting_review'
    if (review.health_report_id) {
      journey.reportId = review.health_report_id
    }
    journey.focusExpertReviewCase({
      conversationId: id,
      healthReportId: review.health_report_id,
      expertReviewStatus: review.status === 'reviewed' ? 'reviewed' : 'awaiting_review'
    })

    if (review.status !== 'reviewed') {
      awaitingReview.value = true
      return
    }

    reviewed.value = true
    orderId.value = review.order_id ?? null

    if (review.order_id) {
      const loaded = await loadFinalizedPlan(review.order_id)
      if (!loaded) {
        const mapped = recommendationFromExpertReview(review)
        if (!mapped || mapped.packages.length === 0) {
          loadError.value = t('recommendation.recoError')
          reviewed.value = false
          return
        }
        applyPackages(mapped)
      }
      try {
        const order = await candor.getOrder(review.order_id)
        openingAmount.value = order.amount_total
      } catch {
        openingAmount.value = null
      }
      return
    }

    const mapped = recommendationFromExpertReview(review)
    if (!mapped || mapped.packages.length === 0) {
      loadError.value = t('recommendation.recoError')
      reviewed.value = false
      return
    }
    applyPackages(mapped)
  } catch (err) {
    if (err instanceof CandorApiError
      && (err.statusCode === 404 || err.errorCode === 'not_found')) {
      loadError.value = t('recommendation.recoError')
      return
    }
    loadError.value = t('recommendation.recoError')
  } finally {
    loading.value = false
  }
}

watch(conversationId, () => {
  void loadCase()
}, { immediate: true })
</script>
