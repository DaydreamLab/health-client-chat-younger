<template>
  <div class="space-y-6 pb-24">
    <div class="space-y-6">
      <section
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

      <!-- Outside path choice so AI load failures stay visible with the 二選. -->
      <p
        v-if="recoError"
        class="rounded-2xl border border-default bg-elevated p-5 text-sm text-error"
        data-testid="recommendation-error"
      >
        {{ recoError }}
      </p>

      <section
        v-else-if="pathChoice === 'ai'"
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
        <div
          v-else
          class="mt-4 grid gap-3 sm:grid-cols-2"
        >
          <label
            v-for="pkg in packages"
            :key="pkg.package_plan_code"
            class="app-path-card"
            :class="{
              'app-path-card-selected': selectedPackageCode === pkg.package_plan_code
            }"
            :data-testid="`package-plan-${pkg.package_plan_code}`"
          >
            <input
              v-model="selectedPackageCode"
              type="radio"
              class="sr-only"
              name="recommendation-package-plan"
              :value="pkg.package_plan_code"
            >
            <div class="flex items-start justify-between gap-2">
              <p class="font-medium text-highlighted">
                {{ pkg.package_plan_name }}
              </p>
            </div>
            <p class="mt-2 text-lg font-semibold text-primary">
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
        v-if="pathChoice === 'ai' && selectedRationale"
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
                  <span
                    v-if="entry.help_label"
                    data-testid="rationale-help-label"
                  >（{{ entry.help_label }}）</span>
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
        v-if="pathChoice === 'ai' && selectedPackage"
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
                <span class="text-sm tabular-nums text-muted">
                  {{ formatTwd(item.monthly_cost) }}
                </span>
              </span>
            </button>
          </li>
        </ul>
      </section>

      <section
        v-if="pathChoice === 'ai' && selectedPackage && bottleAddons.length > 0"
        class="overflow-hidden rounded-2xl border border-default bg-elevated"
        data-testid="bottle-addon-section"
      >
        <div class="border-b border-default px-5 py-4">
          <h2 class="font-semibold text-highlighted">
            {{ $t('recommendation.bottleAddonTitle') }}
          </h2>
          <p class="mt-1 text-sm text-muted">
            {{ $t('recommendation.bottleAddonHint') }}
          </p>
        </div>
        <ul class="divide-y divide-default">
          <li
            v-for="addon in bottleAddons"
            :key="addon.sellable_item_id"
          >
            <label
              class="flex w-full cursor-pointer items-start gap-3 px-5 py-4 transition hover:bg-muted"
              :data-testid="`bottle-addon-${addon.sellable_item_code}`"
            >
              <input
                v-model="selectedBottleAddonCodes"
                type="checkbox"
                class="mt-1 accent-primary"
                :value="addon.sellable_item_code"
                :data-testid="`bottle-addon-check-${addon.sellable_item_code}`"
              >
              <span class="min-w-0 flex-1">
                <span class="flex flex-wrap items-center justify-between gap-2">
                  <span class="font-medium text-highlighted">
                    {{ addon.sellable_item_name }}
                  </span>
                  <span
                    class="shrink-0 text-sm font-semibold tabular-nums text-primary"
                    data-testid="bottle-addon-price"
                  >
                    {{ formatTwd(addon.bottle_price) }}
                  </span>
                </span>
                <span
                  v-if="addon.reason"
                  class="mt-1 block text-sm text-muted whitespace-pre-wrap"
                  data-testid="bottle-addon-reason"
                >
                  {{ addon.reason }}
                </span>
              </span>
            </label>
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
  HealthReportResult,
  RecommendationBottleAddon,
  RecommendationCopy,
  RecommendationPackageItem,
  RecommendationResponse
} from '~/utils/candor-api'
import {
  intersectAddonCodes,
  normalizeAddonCodes,
  parseRecommendationAddons
} from '~/utils/bottle-addon'
import { formatTwd } from '~/utils/first-order'
import { recommendationRequestFromJourney } from '~/utils/recommendation-request'

definePageMeta({
  layout: 'user',
  middleware: 'auth'
})

const { t } = useI18n()
const localePath = useLocalePath()
const journey = useJourneyStore()
const candor = useCandorApi()

type PathChoice = 'ai' | 'expert'

const pathChoice = ref<PathChoice | null>(null)
const detail = ref<RecommendationPackageItem | null>(null)
const reportPending = ref(false)
const reportResults = ref<HealthReportResult[]>([])
const recoPending = ref(false)
const recoError = ref('')
const recommendation = ref<RecommendationResponse | null>(null)
const selectedPackageCode = ref('')
const selectedBottleAddonCodes = ref<string[]>([])

const showAiCheckoutBar = computed(() =>
  pathChoice.value === 'ai'
  && Boolean(selectedPackage.value)
  && !recoPending.value
  && !recoError.value
)

const canGoPackageCheckout = computed(() =>
  Boolean(selectedPackage.value?.composition_hash && selectedPackage.value.items.length > 0)
)

const packages = computed(() => recommendation.value?.packages ?? [])
const selectedPackage = computed(() =>
  packages.value.find(pkg => pkg.package_plan_code === selectedPackageCode.value) ?? null
)
const bottleAddons = computed<RecommendationBottleAddon[]>(() =>
  parseRecommendationAddons(recommendation.value?.addons)
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

watch(selectedBottleAddonCodes, (codes) => {
  journey.selectedBottleAddonCodes = normalizeAddonCodes(codes)
}, { deep: true })

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

function applyPackages(result: RecommendationResponse) {
  recommendation.value = result
  const preferred = journey.selectedPackageCode
  const match = result.packages.find(pkg => pkg.package_plan_code === preferred)
  selectedPackageCode.value = match?.package_plan_code ?? result.packages[0]?.package_plan_code ?? ''
  if (selectedPackageCode.value) {
    journey.selectedPackageCode = selectedPackageCode.value
  }
  const addons = parseRecommendationAddons(result.addons)
  selectedBottleAddonCodes.value = intersectAddonCodes(
    journey.selectedBottleAddonCodes,
    addons
  )
  journey.selectedBottleAddonCodes = [...selectedBottleAddonCodes.value]
}

/** Always re-fetch recommendations when entering the AI path (no stale cache). */
async function loadAiPackages() {
  recoPending.value = true
  recoError.value = ''
  try {
    const result = await candor.createRecommendation(
      recommendationRequestFromJourney({
        conversationId: journey.conversationId,
        reportId: journey.reportId
      })
    )
    applyPackages(result)
  } catch {
    recoError.value = t('recommendation.recoError')
    recommendation.value = null
    selectedBottleAddonCodes.value = []
    journey.selectedBottleAddonCodes = []
  } finally {
    recoPending.value = false
  }
}

async function goPackageCheckout() {
  const pkg = selectedPackage.value
  if (!pkg?.composition_hash) {
    return
  }
  const addonCodes = normalizeAddonCodes(selectedBottleAddonCodes.value)
  journey.selectedBottleAddonCodes = addonCodes
  await navigateTo({
    path: localePath('/app/checkout'),
    query: {
      kind: 'package',
      package_plan_code: pkg.package_plan_code,
      composition_hash: pkg.composition_hash,
      ...(addonCodes.length > 0 ? { addon_codes: addonCodes.join(',') } : {})
    }
  })
}

watch(pathChoice, async (choice) => {
  if (choice === 'expert') {
    journey.selectedBottleAddonCodes = []
    selectedBottleAddonCodes.value = []
    await navigateTo({
      path: localePath('/app/checkout'),
      query: { kind: 'expert_plan' }
    })
    return
  }
  if (choice === 'ai') {
    await loadAiPackages()
  }
})

onMounted(() => {
  void loadReport()
})
</script>
