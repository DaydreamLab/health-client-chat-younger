<template>
  <div
    v-if="payPhase === 'paying'"
    class="flex min-h-[calc(100dvh-8rem)] flex-col items-center justify-center px-4 text-center"
    data-testid="checkout-processing"
  >
    <span
      class="size-10 animate-spin rounded-full border-2 border-muted border-t-primary"
      aria-hidden="true"
    />
    <h1 class="mt-6 text-xl font-semibold text-highlighted">
      {{ $t('checkout.processing') }}
    </h1>
  </div>

  <div
    v-else-if="payPhase === 'success'"
    class="mx-auto flex min-h-[calc(100dvh-8rem)] w-full max-w-sm flex-col items-center justify-center px-4 text-center"
    data-testid="checkout-success"
  >
    <span class="flex size-14 items-center justify-center rounded-full bg-success/10 text-success">
      <UIcon
        name="i-lucide-circle-check"
        class="size-8"
      />
    </span>
    <h1 class="mt-6 text-xl font-semibold text-highlighted">
      {{ $t('checkout.successTitle') }}
    </h1>
    <p class="mt-2 text-sm text-muted">
      {{ $t('checkout.successBody') }}
    </p>
    <AppButton
      class="mt-8 w-full"
      :to="localePath('/app/orders')"
      data-testid="checkout-view-orders"
    >
      {{ $t('checkout.viewOrders') }}
    </AppButton>
  </div>

  <div
    v-else
    class="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]"
  >
    <div class="space-y-6">
      <section
        class="rounded-2xl border border-default bg-elevated p-5"
        data-testid="recommend-report"
      >
        <h2 class="font-semibold text-highlighted">
          {{ $t('shop.reportSection') }}
        </h2>
        <p
          v-if="reportPending"
          class="mt-2 text-sm text-muted"
          data-testid="recommend-report-loading"
        >
          {{ $t('shop.reportLoading') }}
        </p>
        <p
          v-else-if="!reportResults.length"
          class="mt-2 text-sm text-muted"
          data-testid="recommend-report-empty"
        >
          {{ $t('shop.reportEmpty') }}
        </p>
        <div
          v-else
          class="mt-3 max-h-80 overflow-y-auto"
          data-testid="recommend-report-scroll"
        >
          <ReportResultTable :results="reportResults" />
        </div>
      </section>

      <section class="rounded-2xl border border-default bg-elevated p-5">
        <h2 class="text-xl font-semibold text-highlighted">
          {{ $t('shop.packagePick') }}
        </h2>
        <p
          v-if="recoPending"
          class="mt-3 text-sm text-muted"
          data-testid="recommend-loading"
        >
          {{ $t('shop.recoLoading') }}
        </p>
        <p
          v-else-if="recoError"
          class="mt-3 text-sm text-error"
          data-testid="recommend-error"
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
            :class="{ 'app-path-card-selected': selectedPackageCode === pkg.package_plan_code }"
            :data-testid="`shop-package-${pkg.package_plan_code}`"
          >
            <input
              v-model="selectedPackageCode"
              type="radio"
              class="sr-only"
              name="recommend-package"
              :value="pkg.package_plan_code"
            >
            <div class="flex items-start justify-between gap-2">
              <p class="font-medium text-highlighted">
                {{ pkg.package_plan_name }}
              </p>
            </div>
            <p class="mt-2 text-lg font-semibold text-primary">
              {{ $t('shop.perMonth', { price: formatTwd(pkg.price) }) }}
            </p>
            <p class="mt-1 text-sm text-muted">
              {{ $t('shop.itemCountHint', { count: pkg.items.length }) }}
            </p>
          </label>
        </div>
      </section>

      <section
        class="overflow-hidden rounded-2xl border border-default bg-elevated"
        data-testid="recommend-items"
      >
        <div class="border-b border-default px-5 py-4">
          <h2 class="font-semibold text-highlighted">
            {{ $t('shop.itemsTitle') }}
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
          data-testid="recommend-items-empty"
        >
          {{ $t('shop.itemsEmpty') }}
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
              :data-testid="`shop-item-${item.code || item.sellable_item_id}`"
              @click="detail = item"
            >
              <span class="mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <UIcon
                  name="i-lucide-pill"
                  class="size-5"
                />
              </span>
              <span class="min-w-0 flex-1">
                <span class="block font-medium text-highlighted">
                  {{ item.name }}
                </span>
              </span>
              <span class="flex shrink-0 flex-col items-end gap-1">
                <span
                  class="app-badge app-badge-pending"
                  :data-testid="`shop-dose-${item.code || item.sellable_item_id}`"
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
    </div>

    <aside class="h-fit max-h-none rounded-2xl border border-default bg-elevated p-5 lg:sticky lg:top-6 lg:max-h-[calc(100dvh-5.5rem)] lg:overflow-y-auto">
      <h2 class="font-semibold text-highlighted">
        {{ $t('checkout.title') }}
      </h2>
      <dl class="mt-4 space-y-2 text-sm">
        <div class="flex justify-between gap-3">
          <dt class="text-muted">
            {{ $t('checkout.subtotal') }}
          </dt>
          <dd class="tabular-nums text-highlighted">
            {{ formatTwd(checkoutPrice) }}
          </dd>
        </div>
        <div class="flex justify-between gap-3">
          <dt class="text-muted">
            {{ $t('checkout.shippingFee') }}
          </dt>
          <dd class="text-highlighted">
            {{ $t('checkout.shippingFree') }}
          </dd>
        </div>
        <div class="flex justify-between gap-3 border-t border-default pt-2 font-medium">
          <dt class="text-highlighted">
            {{ $t('checkout.total') }}
          </dt>
          <dd
            class="tabular-nums text-primary"
            data-testid="checkout-total"
          >
            {{ formatTwd(checkoutPrice) }}
          </dd>
        </div>
      </dl>

      <form
        class="mt-5 space-y-4"
        @submit.prevent="onPay"
      >
        <label class="block">
          <span class="mb-1.5 block text-sm text-highlighted">{{ $t('checkout.name') }}</span>
          <input
            v-model="name"
            name="name"
            required
            autocomplete="name"
            class="h-10 w-full rounded-md border border-default bg-default px-3 text-sm text-highlighted outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
            data-testid="checkout-name"
          >
        </label>
        <label class="block">
          <span class="mb-1.5 block text-sm text-highlighted">{{ $t('checkout.phone') }}</span>
          <input
            v-model="phone"
            name="phone"
            required
            type="tel"
            autocomplete="tel"
            class="h-10 w-full rounded-md border border-default bg-default px-3 text-sm text-highlighted outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
            data-testid="checkout-phone"
          >
        </label>
        <label class="block">
          <span class="mb-1.5 block text-sm text-highlighted">{{ $t('checkout.address') }}</span>
          <input
            v-model="address"
            name="address"
            required
            autocomplete="street-address"
            class="h-10 w-full rounded-md border border-default bg-default px-3 text-sm text-highlighted outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
            data-testid="checkout-address"
          >
        </label>

        <fieldset class="space-y-1.5">
          <legend class="mb-1.5 text-sm font-medium text-highlighted">
            {{ $t('checkout.delivery') }}
          </legend>
          <label class="flex items-center gap-2 text-sm text-highlighted">
            <input
              v-model="delivery"
              type="radio"
              name="delivery"
              value="home"
              class="accent-primary"
            >
            {{ $t('checkout.deliveryHome') }}
          </label>
          <p class="text-xs text-dimmed">
            {{ $t('checkout.deliveryHint') }}
          </p>
        </fieldset>

        <fieldset class="space-y-1.5">
          <legend class="mb-1.5 text-sm font-medium text-highlighted">
            {{ $t('checkout.payment') }}
          </legend>
          <label
            v-for="method in paymentMethods"
            :key="method"
            class="flex items-center gap-2 text-sm text-highlighted"
          >
            <input
              v-model="paymentMethod"
              type="radio"
              class="accent-primary"
              name="payment"
              :value="method"
            >
            {{ $t(`checkout.${method}`) }}
          </label>
        </fieldset>

        <fieldset class="space-y-1.5">
          <legend class="mb-1.5 text-sm font-medium text-highlighted">
            {{ $t('checkout.invoice') }}
          </legend>
          <label
            v-for="option in invoiceOptions"
            :key="option"
            class="flex items-center gap-2 text-sm text-highlighted"
          >
            <input
              v-model="invoice"
              type="radio"
              class="accent-primary"
              name="invoice"
              :value="option"
            >
            {{ $t(`checkout.${option}`) }}
          </label>
        </fieldset>

        <p
          v-if="error"
          class="text-sm text-error"
          data-testid="checkout-error"
        >
          {{ error }}
        </p>

        <AppButton
          type="submit"
          class="w-full"
          :disabled="!canCheckout"
          data-testid="checkout-submit"
        >
          {{ $t('checkout.submit') }}
        </AppButton>
      </form>
    </aside>

    <Teleport to="body">
      <div
        v-if="detail"
        class="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center"
        data-testid="supplement-detail"
        @click.self="detail = null"
      >
        <article class="max-h-[90dvh] w-full max-w-lg overflow-y-auto rounded-2xl border border-default bg-elevated p-5 shadow-xl">
          <div class="flex items-start justify-between gap-3">
            <div>
              <h2 class="text-lg font-semibold text-highlighted">
                {{ detail.name }}
              </h2>
              <p class="mt-1 text-sm text-muted">
                {{ doseLabel(detail) }}
              </p>
            </div>
            <AppButton
              variant="outline"
              @click="detail = null"
            >
              {{ $t('shop.close') }}
            </AppButton>
          </div>
          <p
            v-if="copyFor(detail.sellable_item_id)?.body"
            class="mt-4 text-sm text-muted"
          >
            {{ copyFor(detail.sellable_item_id)?.body }}
          </p>
          <p class="mt-4 text-xs text-dimmed">
            {{ copyFor(detail.sellable_item_id)?.disclaimer || $t('shop.disclaimer') }}
          </p>
        </article>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { checkoutSchema } from '~/utils/checkout-schema'
import type {
  HealthReportResult,
  RecommendationCopy,
  RecommendationPackageItem,
  RecommendationResponse
} from '~/utils/candor-api'
import {
  formatTwd,
  type ChatMessage,
  type InvoiceType,
  type PaymentMethod
} from '~/utils/first-order'

definePageMeta({
  layout: 'user',
  middleware: 'auth'
})

const PAY_HOLD_MS = 3000

const { t } = useI18n()
const localePath = useLocalePath()
const auth = useAuthStore()
const journey = useJourneyStore()
const api = useFirstOrderApi()
const candor = useCandorApi()

const name = ref(auth.displayName)
const phone = ref('')
const address = ref('')
const delivery = ref<'home'>('home')
const paymentMethod = ref<PaymentMethod>('card')
const invoice = ref<InvoiceType>('cloud')
const payPhase = ref<'form' | 'paying' | 'success'>('form')
const error = ref('')
const detail = ref<RecommendationPackageItem | null>(null)

const paymentMethods: PaymentMethod[] = ['card', 'linepay', 'atm']
const invoiceOptions: InvoiceType[] = ['cloud', 'company', 'donate']

const reportPending = ref(false)
const reportResults = ref<HealthReportResult[]>([])
const recoPending = ref(false)
const recoError = ref('')
const recommendation = ref<RecommendationResponse | null>(null)
const selectedPackageCode = ref('')

const packages = computed(() => recommendation.value?.packages ?? [])
const selectedPackage = computed(() =>
  packages.value.find(pkg => pkg.package_plan_code === selectedPackageCode.value) ?? null
)
const checkoutPrice = computed(() => selectedPackage.value?.price ?? 0)
const canCheckout = computed(() =>
  Boolean(selectedPackage.value && selectedPackage.value.items.length > 0)
)

const copyByProductId = computed(() => {
  const map = new Map<string, RecommendationCopy>()
  for (const item of recommendation.value?.items ?? []) {
    map.set(item.sellable_item_id, item.copy)
  }
  return map
})

function copyFor(sellableItemId: string): RecommendationCopy | undefined {
  return copyByProductId.value.get(sellableItemId)
}

function formatDoseCount(value: number): string {
  if (Number.isInteger(value)) {
    return String(value)
  }
  return String(value)
}

function doseLabel(item: RecommendationPackageItem): string {
  return t('shop.doseLocked', { count: formatDoseCount(item.daily_dose) })
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

async function loadRecommendation() {
  recoPending.value = true
  recoError.value = ''
  try {
    const body: Parameters<typeof candor.createRecommendation>[0] = {
      enrich: 'template',
      limit: 30
    }
    if (journey.reportId) {
      body.report_id = journey.reportId
    }
    if (journey.conversationId) {
      body.conversation_id = journey.conversationId
    }
    const result = await candor.createRecommendation(body)
    recommendation.value = result
    const preferred = journey.selectedPackageCode
    const match = result.packages.find(pkg => pkg.package_plan_code === preferred)
    selectedPackageCode.value = match?.package_plan_code ?? result.packages[0]?.package_plan_code ?? ''
    if (selectedPackageCode.value) {
      journey.selectedPackageCode = selectedPackageCode.value
    }
  } catch {
    recoError.value = t('shop.recoError')
    recommendation.value = null
  } finally {
    recoPending.value = false
  }
}

async function onPay(event: Event) {
  if (!canCheckout.value || !selectedPackage.value) {
    error.value = t('checkout.error')
    return
  }

  const form = event.target
  const data = form instanceof HTMLFormElement ? new FormData(form) : null
  const parsed = checkoutSchema.safeParse({
    name: String(data?.get('name') ?? name.value),
    phone: String(data?.get('phone') ?? phone.value),
    address: String(data?.get('address') ?? address.value),
    paymentMethod: data?.get('payment') ?? paymentMethod.value,
    invoice: data?.get('invoice') ?? invoice.value,
    packagePlanCode: selectedPackage.value.package_plan_code
  })

  if (!parsed.success) {
    error.value = t('checkout.error')
    return
  }

  payPhase.value = 'paying'
  error.value = ''

  const pkg = selectedPackage.value
  try {
    await Promise.all([
      api.createOrder({
        packagePlanCode: parsed.data.packagePlanCode,
        packageName: pkg.package_plan_name,
        amount: pkg.price,
        productCodes: pkg.items.map(item => item.code || item.sellable_item_id),
        productNames: pkg.items.map(item => item.name ?? item.code),
        paymentMethod: parsed.data.paymentMethod,
        invoice: parsed.data.invoice,
        recipient: {
          name: parsed.data.name,
          phone: parsed.data.phone,
          address: parsed.data.address,
          email: auth.user?.email ?? ''
        },
        messages: JSON.parse(JSON.stringify(journey.snapshotMessages())) as ChatMessage[],
        compositionHash: pkg.composition_hash,
        reportId: recommendation.value?.report_id ?? journey.reportId,
        conversationId: journey.conversationId,
        recommendationRunId: recommendation.value?.run_id
      }),
      new Promise(resolve => setTimeout(resolve, PAY_HOLD_MS))
    ])
    payPhase.value = 'success'
    journey.clearSession()
  } catch {
    error.value = t('checkout.error')
    payPhase.value = 'form'
  }
}

onMounted(() => {
  if (!journey.hasAnalysis) {
    journey.hasAnalysis = true
  }
  void loadReport()
  void loadRecommendation()
})
</script>
