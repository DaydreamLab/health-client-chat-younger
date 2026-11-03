<template>
  <div class="space-y-6 pb-24">
    <div class="space-y-6">
      <section
        v-if="showPathChoice"
        class="rounded-2xl border border-default bg-elevated p-5"
        data-testid="recommendation-path-choice"
      >
        <p
          v-if="!pathChoice"
          class="text-sm text-muted"
          data-testid="recommendation-path-prompt"
        >
          {{ $t('recommendation.pathChoicePrompt') }}
        </p>
        <div class="mt-4 grid gap-3 sm:grid-cols-2">
          <label
            class="app-path-card"
            :class="{ 'app-path-card-selected': pathChoice === 'ai' }"
            data-testid="recommendation-path-ai"
          >
            <input
              v-model="pathChoice"
              type="radio"
              class="sr-only"
              name="recommendation-path"
              value="ai"
            >
            <p class="font-medium text-highlighted">
              {{ $t('recommendation.pathAiTitle') }}
            </p>
            <p class="mt-2 text-sm text-muted">
              {{ $t('recommendation.pathAiBody') }}
            </p>
          </label>
          <label
            class="app-path-card"
            :class="{ 'app-path-card-selected': pathChoice === 'expert' }"
            data-testid="recommendation-path-expert"
          >
            <input
              v-model="pathChoice"
              type="radio"
              class="sr-only"
              name="recommendation-path"
              value="expert"
            >
            <p class="font-medium text-highlighted">
              {{ $t('recommendation.pathExpertTitle') }}
            </p>
            <p class="mt-2 text-lg font-semibold text-primary">
              {{ $t('recommendation.pathExpertPrice') }}
            </p>
            <p class="mt-1 text-sm text-muted">
              {{ $t('recommendation.pathExpertBody') }}
            </p>
          </label>
        </div>
      </section>

      <section
        v-if="expertPlanReadonly"
        class="rounded-2xl border border-default bg-elevated p-5"
        data-testid="expert-plan-result"
      >
        <h2 class="text-xl font-semibold text-highlighted">
          {{ $t('recommendation.readyTitle') }}
        </h2>
        <p
          class="mt-2 text-sm text-muted"
          data-testid="expert-plan-result-readonly-hint"
        >
          {{ $t('expertPlans.resultReadonlyHint') }}
        </p>
        <AppButton
          v-if="expertPlanOrderId"
          class="mt-6"
          :to="localePath(`/app/orders/${expertPlanOrderId}`)"
          data-testid="expert-plan-view-order"
        >
          {{ $t('expertPlans.openOrder') }}
        </AppButton>
      </section>

      <section
        v-if="showPackagePick"
        class="rounded-2xl border border-default bg-elevated p-5"
      >
        <h2 class="text-xl font-semibold text-highlighted">
          {{ $t('recommendation.packagePick') }}
        </h2>
        <p
          v-if="recoPending"
          class="mt-3 text-sm text-muted"
          data-testid="recommendation-loading"
        >
          {{ $t('recommendation.recoLoading') }}
        </p>
        <p
          v-else-if="recoError"
          class="mt-3 text-sm text-error"
          data-testid="recommendation-error"
        >
          {{ recoError }}
        </p>
        <div
          v-else
          class="mt-4 grid gap-3 sm:grid-cols-2"
        >
          <label
            v-for="pkg in packages"
            :key="pkg.package_plan_code"
            class="app-path-card"
            :class="{
              'app-path-card-selected': selectedPackageCode === pkg.package_plan_code,
              'pointer-events-none': expertPlanReadonly
            }"
            :data-testid="`package-plan-${pkg.package_plan_code}`"
          >
            <input
              v-model="selectedPackageCode"
              type="radio"
              class="sr-only"
              name="recommendation-package-plan"
              :value="pkg.package_plan_code"
              :disabled="expertPlanReadonly"
            >
            <div class="flex items-start justify-between gap-2">
              <p class="font-medium text-highlighted">
                {{ pkg.package_plan_name }}
              </p>
            </div>
            <p
              v-if="expertPlanReadonly && expertPlanOpeningAmount != null"
              class="mt-2 text-lg font-semibold text-primary"
              data-testid="expert-plan-result-total"
            >
              {{ formatTwd(expertPlanOpeningAmount) }}
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
        class="rounded-2xl border border-default bg-elevated p-5"
        data-testid="health-report"
      >
        <h2 class="font-semibold text-highlighted">
          {{ $t('recommendation.reportSection') }}
        </h2>
        <p
          v-if="reportPending"
          class="mt-2 text-sm text-muted"
          data-testid="health-report-loading"
        >
          {{ $t('recommendation.reportLoading') }}
        </p>
        <p
          v-else-if="!reportResults.length"
          class="mt-2 text-sm text-muted"
          data-testid="health-report-empty"
        >
          {{ $t('recommendation.reportEmpty') }}
        </p>
        <template v-else>
          <div class="mt-3">
            <ReportResultLegend />
          </div>
          <div
            class="mt-3 max-h-80 overflow-y-auto"
            data-testid="health-report-scroll"
          >
            <ReportResultTable
              :results="reportResults"
              :show-legend="false"
            />
          </div>
        </template>
      </section>

      <section
        v-if="(reviewPhase === 'viewing' || reviewPhase === 'legacy' || expertPlanReadonly) && selectedRationale"
        class="overflow-hidden rounded-2xl border border-default bg-elevated"
        data-testid="package-rationale"
      >
        <div class="border-b border-default px-5 py-4">
          <div class="flex flex-wrap items-center gap-2">
            <h2 class="font-semibold text-highlighted">
              {{ selectedRationale.headline || $t('recommendation.rationaleTitle') }}
            </h2>
            <span
              v-for="hit in selectedRationale.claim_guard_hits"
              :key="`card-${hit.term}-${hit.severity}`"
              class="inline-flex items-center rounded-full bg-error/10 px-2 py-0.5 text-xs font-medium text-error"
              data-testid="rationale-claim-hit"
            >
              {{ hit.term }}
            </span>
          </div>
        </div>
        <div
          class="px-5 py-4 space-y-4"
          data-testid="rationale-body"
        >
          <template v-if="rationaleGroups.length">
            <div
              v-for="group in rationaleGroups"
              :key="group.key"
              class="space-y-1"
              data-testid="rationale-group"
            >
              <p class="text-sm font-medium text-highlighted">
                {{ group.title }}
              </p>
              <div
                v-for="(entry, entryIndex) in group.entries"
                :key="`${group.key}-${entry.code}-${entryIndex}`"
                class="space-y-1"
                data-testid="rationale-entry"
              >
                <div class="flex flex-wrap items-center gap-2 text-sm text-muted">
                  <span>- 建議補充{{ entry.ingredient_label }}成份：</span>
                  <span
                    class="inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary"
                    data-testid="rationale-product-badge"
                  >
                    {{ entry.name }}
                  </span>
                </div>
                <p
                  v-if="displayReasonForProductCode(entry.code)"
                  class="text-sm text-muted whitespace-pre-wrap leading-relaxed"
                  data-testid="rationale-display-reason"
                >
                  {{ displayReasonForProductCode(entry.code) }}
                </p>
              </div>
            </div>
          </template>
          <p
            v-else-if="selectedRationale.body"
            class="text-sm text-muted whitespace-pre-wrap leading-relaxed"
          >
            {{ selectedRationale.body }}
          </p>
          <div
            v-if="orphanDisplayReasons.length"
            class="space-y-3"
            :class="{ 'border-t border-default pt-4': rationaleGroups.length || selectedRationale.body }"
            data-testid="rationale-orphan-reasons"
          >
            <div
              v-for="orphan in orphanDisplayReasons"
              :key="`orphan-${orphan.code}`"
              class="space-y-1"
              data-testid="rationale-orphan-reason"
            >
              <div class="flex flex-wrap items-center gap-2 text-sm text-muted">
                <span
                  class="inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary"
                  data-testid="rationale-orphan-product-badge"
                >
                  {{ orphan.name }}
                </span>
              </div>
              <p
                class="text-sm text-muted whitespace-pre-wrap leading-relaxed"
                data-testid="rationale-display-reason"
              >
                {{ orphan.reason }}
              </p>
            </div>
          </div>
        </div>
      </section>

      <section
        v-if="(reviewPhase === 'viewing' || reviewPhase === 'legacy' || expertPlanReadonly) && selectedPackage"
        class="overflow-hidden rounded-2xl border border-default bg-elevated"
        data-testid="package-items"
      >
        <div class="border-b border-default px-5 py-4">
          <h2 class="font-semibold text-highlighted">
            {{ $t('recommendation.itemsTitle') }}
          </h2>
          <p
            v-if="selectedPackage"
            class="mt-1 text-sm text-muted"
          >
            {{ selectedPackage.package_plan_name }}
          </p>
        </div>
        <p
          v-if="!selectedPackage || !selectedPackage.items.length"
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
          >
            <button
              type="button"
              class="flex w-full items-start gap-3 px-5 py-4 text-start transition hover:bg-muted focus-visible:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary/40"
              :data-testid="`sellable-item-${item.code || item.sellable_item_id}`"
              @click="detail = item"
            >
              <span class="mt-0.5 size-10 shrink-0 overflow-hidden rounded-xl bg-primary/10 text-primary">
                <img
                  v-if="item.image_url"
                  :src="item.image_url"
                  :alt="item.name || ''"
                  class="size-full object-cover"
                  loading="lazy"
                  data-testid="sellable-item-image"
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
                    :data-testid="`sellable-item-kind-${item.code || item.sellable_item_id}`"
                  >
                    {{ item.is_core ? $t('recommendation.itemKindCore') : $t('recommendation.itemKindFunctional') }}
                  </span>
                </span>
              </span>
              <span class="flex shrink-0 flex-col items-end gap-1">
                <span
                  class="app-badge app-badge-pending"
                  :data-testid="`sellable-item-dose-${item.code || item.sellable_item_id}`"
                >
                  {{ doseLabel(item) }}
                </span>
                <span
                  v-if="!expertPlanReadonly"
                  class="text-sm tabular-nums text-muted"
                >
                  {{ formatTwd(item.monthly_cost) }}
                </span>
              </span>
            </button>
          </li>
        </ul>
      </section>
    </div>

    <div
      v-if="showAiCheckoutBar"
      class="fixed inset-x-0 bottom-0 z-20 border-t border-default bg-elevated/95 px-4 py-3 backdrop-blur-sm"
      data-testid="recommendation-checkout-bar"
    >
      <div class="mx-auto flex max-w-lg items-center gap-3">
        <p class="min-w-0 flex-1 text-sm text-muted">
          {{ selectedPackage?.package_plan_name }}
        </p>
        <AppButton
          class="shrink-0"
          :disabled="!canGoPackageCheckout"
          data-testid="recommendation-go-checkout"
          @click="goPackageCheckout"
        >
          {{ $t('recommendation.goCheckout') }}
        </AppButton>
      </div>
    </div>

    <Teleport to="body">
      <div
        v-if="detail"
        class="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center"
        data-testid="sellable-item-detail"
        @click.self="detail = null"
      >
        <article class="max-h-[90dvh] w-full max-w-lg overflow-y-auto rounded-2xl border border-default bg-elevated p-5 shadow-xl">
          <div class="flex items-start justify-between gap-3">
            <div class="flex min-w-0 items-start gap-3">
              <span class="size-16 shrink-0 overflow-hidden rounded-2xl bg-primary/10 text-primary">
                <img
                  v-if="detail.image_url"
                  :src="detail.image_url"
                  :alt="detail.name || ''"
                  class="size-full object-cover"
                  data-testid="sellable-item-detail-image"
                >
                <span
                  v-else
                  class="flex size-full items-center justify-center"
                >
                  <UIcon
                    name="i-lucide-pill"
                    class="size-7"
                  />
                </span>
              </span>
              <div class="min-w-0">
                <div class="flex flex-wrap items-center gap-2">
                  <h2 class="text-lg font-semibold text-highlighted">
                    {{ detail.name }}
                  </h2>
                  <span
                    class="app-badge"
                    :class="detail.is_core ? 'app-badge-demo' : 'app-badge-pending'"
                    data-testid="sellable-item-detail-kind"
                  >
                    {{ detail.is_core ? $t('recommendation.itemKindCore') : $t('recommendation.itemKindFunctional') }}
                  </span>
                </div>
                <p class="mt-1 text-sm text-muted">
                  {{ doseLabel(detail) }}
                </p>
              </div>
            </div>
            <AppButton
              variant="outline"
              @click="detail = null"
            >
              {{ $t('recommendation.close') }}
            </AppButton>
          </div>
          <p
            v-if="copyFor(detail.sellable_item_id)?.body"
            class="mt-4 text-sm text-muted"
          >
            {{ copyFor(detail.sellable_item_id)?.body }}
          </p>
          <p class="mt-4 text-xs text-dimmed">
            {{ copyFor(detail.sellable_item_id)?.disclaimer || $t('recommendation.disclaimer') }}
          </p>
        </article>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import type {
  FinalizedPlan,
  HealthReportResult,
  RecommendationCopy,
  RecommendationPackage,
  RecommendationPackageItem,
  RecommendationResponse
} from '~/utils/candor-api'
import { CandorApiError } from '~/utils/candor-api'
import { formatTwd } from '~/utils/first-order'
import { recommendationRequestFromJourney } from '~/utils/recommendation-request'
import { recommendationFromExpertReview } from '~/utils/expert-review'

definePageMeta({
  layout: 'user',
  middleware: 'auth'
})

const { t } = useI18n()
const localePath = useLocalePath()
const route = useRoute()
const auth = useAuthStore()
const journey = useJourneyStore()
const candor = useCandorApi()

type ReviewPhase = 'loading' | 'viewing' | 'legacy' | 'error'
type PathChoice = 'ai' | 'expert'

const reviewPhase = ref<ReviewPhase>('loading')
const expertPlanReadonly = ref(false)
const expertPlanOpeningAmount = ref<number | null>(null)
const expertPlanOrderId = ref<string | null>(null)
const pathChoice = ref<PathChoice | null>(null)

const detail = ref<RecommendationPackageItem | null>(null)
const reportPending = ref(false)
const reportResults = ref<HealthReportResult[]>([])
const recoPending = ref(false)
const recoError = ref('')
const recommendation = ref<RecommendationResponse | null>(null)
const selectedPackageCode = ref('')
const aiPackagesLoaded = ref(false)

const showPathChoice = computed(() =>
  !expertPlanReadonly.value
  && (reviewPhase.value === 'viewing' || reviewPhase.value === 'legacy')
)

const showPackagePick = computed(() =>
  !expertPlanReadonly.value
  && pathChoice.value === 'ai'
  && showPathChoice.value
)

const showAiCheckoutBar = computed(() =>
  showPackagePick.value
  && Boolean(selectedPackage.value)
)

const canGoPackageCheckout = computed(() =>
  Boolean(selectedPackage.value?.composition_hash && selectedPackage.value.items.length > 0)
)

const packages = computed(() => recommendation.value?.packages ?? [])
const selectedPackage = computed(() =>
  packages.value.find(pkg => pkg.package_plan_code === selectedPackageCode.value) ?? null
)

const selectedRationale = computed(() => selectedPackage.value?.rationale ?? null)
const rationaleGroups = computed(() => selectedRationale.value?.groups ?? [])
const displayReasonByProductCode = computed(() => {
  const map = new Map<string, string>()
  for (const item of selectedPackage.value?.items ?? []) {
    const reason = item.display_reason?.trim()
    if (!reason) {
      continue
    }
    if (item.code) {
      map.set(item.code, reason)
    }
  }
  return map
})
function displayReasonForProductCode(code: string): string | null {
  return displayReasonByProductCode.value.get(code) ?? null
}
const rationaleEntryProductCodes = computed(() => {
  const codes = new Set<string>()
  for (const group of rationaleGroups.value) {
    for (const entry of group.entries) {
      if (entry.code) {
        codes.add(entry.code)
      }
    }
  }
  return codes
})
const orphanDisplayReasons = computed(() => {
  const orphans: Array<{ code: string, name: string, reason: string }> = []
  for (const item of selectedPackage.value?.items ?? []) {
    const reason = item.display_reason?.trim()
    if (!reason || !item.code || rationaleEntryProductCodes.value.has(item.code)) {
      continue
    }
    orphans.push({
      code: item.code,
      name: item.name?.trim() || item.code,
      reason
    })
  }
  return orphans
})

const copyBySellableItemId = computed(() => {
  const map = new Map<string, RecommendationCopy>()
  for (const item of recommendation.value?.items ?? []) {
    map.set(item.sellable_item_id, item.copy)
  }
  return map
})

function copyFor(sellableItemId: string): RecommendationCopy | undefined {
  return copyBySellableItemId.value.get(sellableItemId)
}

function formatDoseCount(value: number): string {
  if (Number.isInteger(value)) {
    return String(value)
  }
  return String(value)
}

function doseLabel(item: RecommendationPackageItem): string {
  return t('recommendation.doseLocked', { count: formatDoseCount(item.daily_dose) })
}

watch(selectedPackageCode, (code) => {
  if (code) {
    journey.selectedPackageCode = code
  }
})

async function loadReport() {
  const reportId = journey.reportId
  if (!reportId) {
    reportResults.value = []
    return
  }
  reportPending.value = true
  try {
    const report = await candor.getHealthReport(reportId)
    reportResults.value = Array.isArray(report.results) ? report.results : []
  } catch {
    reportResults.value = []
  } finally {
    reportPending.value = false
  }
}

function recommendationFromFinalizedPlan(plan: FinalizedPlan): RecommendationResponse {
  const packages: RecommendationPackage[] = (plan.packages ?? []).map((pkg, index) => {
    const code = pkg.package_plan_code?.trim() || `plan-${index}`
    const items: RecommendationPackageItem[] = (pkg.items ?? []).map((item, rank) => ({
      rank: rank + 1,
      sellable_item_id: item.sellable_item_code?.trim() || String(rank),
      code: item.sellable_item_code?.trim() || '',
      name: item.name_zh?.trim() || item.sellable_item_code?.trim() || '',
      unit_price: 0,
      daily_dose: item.daily_dose ?? 1,
      monthly_cost: 0,
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
    packages
  }
}

async function loadPaidExpertFinalizedPlan(orderId: string) {
  try {
    const finalized = await candor.getFinalizedPlan(orderId)
    if (!finalized.packages?.length) {
      return false
    }
    applyReviewedPackages(recommendationFromFinalizedPlan(finalized))
    return true
  } catch {
    return false
  }
}

function applyReviewedPackages(result: RecommendationResponse) {
  recommendation.value = result
  const preferred = journey.selectedPackageCode
  const match = result.packages.find(pkg => pkg.package_plan_code === preferred)
  selectedPackageCode.value = match?.package_plan_code ?? result.packages[0]?.package_plan_code ?? ''
  if (selectedPackageCode.value) {
    journey.selectedPackageCode = selectedPackageCode.value
  }
}

async function loadAiPackages() {
  if (aiPackagesLoaded.value && packages.value.length > 0) {
    return
  }
  recoPending.value = true
  recoError.value = ''
  try {
    const result = await candor.createRecommendation(
      recommendationRequestFromJourney({
        conversationId: journey.conversationId,
        reportId: journey.reportId
      })
    )
    applyReviewedPackages(result)
    aiPackagesLoaded.value = true
  } catch {
    recoError.value = t('recommendation.recoError')
    recommendation.value = null
  } finally {
    recoPending.value = false
  }
}

function isStandardFlow(): boolean {
  const raw = route.query.flow
  if (Array.isArray(raw)) {
    return raw.includes('standard')
  }
  return raw === 'standard'
}

async function goPackageCheckout() {
  const pkg = selectedPackage.value
  if (!pkg?.composition_hash) {
    return
  }
  await navigateTo({
    path: localePath('/app/checkout'),
    query: {
      kind: 'package',
      package_plan_code: pkg.package_plan_code,
      composition_hash: pkg.composition_hash
    }
  })
}

watch(pathChoice, async (choice) => {
  if (choice === 'expert') {
    await navigateTo({
      path: localePath('/app/checkout'),
      query: { kind: 'expert_plan' }
    })
    return
  }
  if (choice === 'ai') {
    if (packages.value.length === 0) {
      await loadAiPackages()
    }
  }
})

async function loadRecommendation() {
  pathChoice.value = null
  aiPackagesLoaded.value = false
  expertPlanReadonly.value = false
  expertPlanOpeningAmount.value = null
  expertPlanOrderId.value = null

  if (isStandardFlow()) {
    reviewPhase.value = 'legacy'
    return
  }

  const conversationId = journey.conversationId?.trim() ?? ''
  if (!conversationId || !auth.isMember) {
    reviewPhase.value = 'legacy'
    return
  }

  recoPending.value = true
  recoError.value = ''
  try {
    const review = await candor.getExpertReview(conversationId)
    journey.expertReviewStatus = review.status === 'reviewed' ? 'reviewed' : 'awaiting_review'
    if (review.health_report_id) {
      journey.reportId = review.health_report_id
    }

    const paidExpertPlan = Boolean(review.order_id)
    expertPlanOrderId.value = review.order_id ?? null
    expertPlanReadonly.value = paidExpertPlan && review.status === 'reviewed'

    if (expertPlanReadonly.value && review.order_id) {
      const loaded = await loadPaidExpertFinalizedPlan(review.order_id)
      if (!loaded) {
        const mapped = recommendationFromExpertReview(review)
        if (!mapped || mapped.packages.length === 0) {
          recoError.value = t('recommendation.recoError')
          recommendation.value = null
          reviewPhase.value = 'error'
          return
        }
        applyReviewedPackages(mapped)
      }
      try {
        const order = await candor.getOrder(review.order_id)
        expertPlanOpeningAmount.value = order.amount_total
      } catch {
        expertPlanOpeningAmount.value = null
      }
      aiPackagesLoaded.value = true
      reviewPhase.value = 'viewing'
      return
    }

    if (review.status === 'reviewed') {
      const mapped = recommendationFromExpertReview(review)
      if (!mapped || mapped.packages.length === 0) {
        recoError.value = t('recommendation.recoError')
        recommendation.value = null
        reviewPhase.value = 'error'
        return
      }
      applyReviewedPackages(mapped)
      aiPackagesLoaded.value = true
    } else {
      recommendation.value = null
      selectedPackageCode.value = ''
    }
    reviewPhase.value = 'viewing'
  } catch (err) {
    if (err instanceof CandorApiError && err.errorCode === 'not_found') {
      journey.expertReviewStatus = 'none'
      recommendation.value = null
      reviewPhase.value = 'viewing'
      return
    }
    if (err instanceof CandorApiError && (err.errorCode === 'member_required' || err.statusCode === 401)) {
      reviewPhase.value = 'legacy'
      return
    }
    recoError.value = t('recommendation.recoError')
    recommendation.value = null
    reviewPhase.value = 'error'
  } finally {
    recoPending.value = false
  }
}

onMounted(() => {
  void loadReport()
  void loadRecommendation()
})
</script>
