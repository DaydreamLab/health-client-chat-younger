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
        <div
          v-else
          class="mt-3 max-h-80 overflow-y-auto"
          data-testid="health-report-scroll"
        >
          <ReportResultTable :results="reportResults" />
        </div>
      </section>

      <section class="rounded-2xl border border-default bg-elevated p-5">
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
            :class="{ 'app-path-card-selected': selectedPackageCode === pkg.package_plan_code }"
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
    </div>

    <aside
      class="relative h-fit max-h-none rounded-2xl border border-default bg-elevated p-5 lg:sticky lg:top-6 lg:max-h-[calc(100dvh-5.5rem)] lg:overflow-y-auto"
      data-testid="checkout-card"
    >
      <div
        v-if="!auth.isMember"
        class="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 rounded-2xl bg-elevated/80 px-6 text-center backdrop-blur-sm"
        data-testid="checkout-auth-gate"
      >
        <p class="text-sm font-medium text-highlighted">
          {{ $t('checkout.memberRequired') }}
        </p>
        <p class="text-xs text-muted">
          {{ $t('checkout.memberRequiredHint') }}
        </p>
        <div class="mt-2 flex w-full flex-col gap-2">
          <AppButton
            class="w-full"
            :to="loginRedirect"
            data-testid="checkout-login"
          >
            {{ $t('checkout.login') }}
          </AppButton>
          <AppButton
            class="w-full"
            variant="outline"
            :to="registerRedirect"
            data-testid="checkout-register"
          >
            {{ $t('checkout.register') }}
          </AppButton>
        </div>
      </div>

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
        <div class="block space-y-1.5">
          <span class="block text-sm text-highlighted">{{ $t('checkout.addressRegion') }}</span>
          <div class="grid grid-cols-2 gap-2">
            <label class="block min-w-0">
              <span class="sr-only">{{ $t('checkout.addressCity') }}</span>
              <select
                v-model="addressCity"
                name="address_city"
                required
                autocomplete="address-level1"
                class="h-10 w-full rounded-md border border-default bg-default px-3 text-sm text-highlighted outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                data-testid="checkout-address-city"
              >
                <option
                  value=""
                  disabled
                >
                  {{ $t('checkout.addressCity') }}
                </option>
                <option
                  v-for="city in taiwanCities"
                  :key="city"
                  :value="city"
                >
                  {{ city }}
                </option>
              </select>
            </label>
            <label class="block min-w-0">
              <span class="sr-only">{{ $t('checkout.addressDistrict') }}</span>
              <select
                v-model="addressDistrict"
                name="address_district"
                required
                :disabled="!addressCity"
                autocomplete="address-level2"
                class="h-10 w-full rounded-md border border-default bg-default px-3 text-sm text-highlighted outline-none focus-visible:ring-2 focus-visible:ring-primary/40 disabled:opacity-50"
                data-testid="checkout-address-district"
              >
                <option
                  value=""
                  disabled
                >
                  {{ $t('checkout.addressDistrict') }}
                </option>
                <option
                  v-for="district in addressDistricts"
                  :key="district"
                  :value="district"
                >
                  {{ district }}
                </option>
              </select>
            </label>
          </div>
        </div>
        <label class="block">
          <span class="mb-1.5 block text-sm text-highlighted">{{ $t('checkout.addressDetail') }}</span>
          <input
            v-model="addressDetail"
            name="address_detail"
            required
            autocomplete="street-address"
            :placeholder="$t('checkout.addressDetailPlaceholder')"
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
            class="flex items-center gap-2 text-sm"
            :class="method === 'card' ? 'text-highlighted' : 'text-dimmed'"
          >
            <input
              v-model="paymentMethod"
              type="radio"
              class="accent-primary"
              name="payment"
              :value="method"
              :disabled="method !== 'card'"
            >
            {{ method === 'card' ? $t('checkout.card') : $t(`checkout.${method}ComingSoon`) }}
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
          <p
            v-if="invoice === 'member'"
            class="text-xs text-muted"
            data-testid="checkout-invoice-member-email"
          >
            {{ auth.user?.email || $t('checkout.memberCarrierHint') }}
          </p>
          <label
            v-else
            class="block"
          >
            <span class="mb-1.5 block text-sm text-highlighted">
              {{ $t(`checkout.carrier_${invoice}`) }}
            </span>
            <input
              v-model="invoiceCarrier"
              name="invoice_carrier"
              required
              class="h-10 w-full rounded-md border border-default bg-default px-3 text-sm text-highlighted outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
              :placeholder="$t(`checkout.carrierPlaceholder_${invoice}`)"
              data-testid="checkout-invoice-carrier"
            >
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
        data-testid="sellable-item-detail"
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
import { checkoutSchema } from '~/utils/checkout-schema'
import type {
  HealthReportResult,
  RecommendationCopy,
  RecommendationPackage,
  RecommendationPackageItem,
  RecommendationResponse
} from '~/utils/candor-api'
import { CandorApiError } from '~/utils/candor-api'
import {
  formatTwd,
  type ChatMessage,
  type InvoiceType,
  type PaymentMethod
} from '~/utils/first-order'
import {
  TAIWAN_CITIES,
  composeTaiwanAddress,
  districtsForCity
} from '~/utils/taiwan-regions'

definePageMeta({
  layout: 'user',
  middleware: 'auth'
})

const PAY_HOLD_MS = 3000

const { t } = useI18n()
const localePath = useLocalePath()
const route = useRoute()
const auth = useAuthStore()
const journey = useJourneyStore()
const api = useFirstOrderApi()
const candor = useCandorApi()

const name = ref(auth.displayName)
const phone = ref('')
const addressCity = ref('')
const addressDistrict = ref('')
const addressDetail = ref('')
const taiwanCities = TAIWAN_CITIES
const addressDistricts = computed(() => districtsForCity(addressCity.value))
const delivery = ref<'home'>('home')
const paymentMethod = ref<PaymentMethod>('card')
const invoice = ref<InvoiceType>('member')
const invoiceCarrier = ref('')
const payPhase = ref<'form' | 'paying' | 'success'>('form')
const error = ref('')
const detail = ref<RecommendationPackageItem | null>(null)

const paymentMethods: PaymentMethod[] = ['card', 'linepay', 'atm']
const invoiceOptions: InvoiceType[] = ['member', 'cloud', 'company', 'donate']

const reportPending = ref(false)
const reportResults = ref<HealthReportResult[]>([])
const recoPending = ref(false)
const recoError = ref('')
const recommendation = ref<RecommendationResponse | null>(null)
const selectedPackageCode = ref('')

const loginRedirect = computed(() =>
  `${localePath('/login')}?redirect=${encodeURIComponent(route.fullPath)}&mode=login`
)
const registerRedirect = computed(() =>
  `${localePath('/login')}?redirect=${encodeURIComponent(route.fullPath)}&mode=register`
)

watch(addressCity, () => {
  addressDistrict.value = ''
})

watch(invoice, (value) => {
  if (value === 'member') {
    invoiceCarrier.value = auth.user?.email ?? ''
  } else if (invoiceCarrier.value === (auth.user?.email ?? '')) {
    invoiceCarrier.value = ''
  }
})

watch(() => auth.user?.email, (email) => {
  if (invoice.value === 'member' && email) {
    invoiceCarrier.value = email
  }
}, { immediate: true })

const packages = computed(() => recommendation.value?.packages ?? [])
const selectedPackage = computed(() =>
  packages.value.find(pkg => pkg.package_plan_code === selectedPackageCode.value) ?? null
)
const checkoutPrice = computed(() => selectedPackage.value?.price ?? 0)
const canCheckout = computed(() =>
  Boolean(auth.isMember && selectedPackage.value && selectedPackage.value.items.length > 0 && selectedPackage.value.composition_hash)
)

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
    recoError.value = t('recommendation.recoError')
    recommendation.value = null
  } finally {
    recoPending.value = false
  }
}

function applyCompositionChanged(pkg: RecommendationPackage) {
  if (!recommendation.value) {
    return
  }
  recommendation.value = {
    ...recommendation.value,
    packages: recommendation.value.packages.map(entry =>
      entry.package_plan_code === pkg.package_plan_code ? { ...entry, ...pkg } : entry
    )
  }
  selectedPackageCode.value = pkg.package_plan_code
  error.value = t('checkout.compositionChanged')
}

async function onPay(event: Event) {
  if (!auth.isMember) {
    error.value = t('checkout.memberRequired')
    return
  }
  if (!canCheckout.value || !selectedPackage.value) {
    error.value = t('checkout.error')
    return
  }

  const form = event.target
  const data = form instanceof HTMLFormElement ? new FormData(form) : null
  const carrier = invoice.value === 'member'
    ? (auth.user?.email ?? '')
    : String(data?.get('invoice_carrier') ?? invoiceCarrier.value)
  const composedAddress = composeTaiwanAddress(
    String(data?.get('address_city') ?? addressCity.value),
    String(data?.get('address_district') ?? addressDistrict.value),
    String(data?.get('address_detail') ?? addressDetail.value)
  )
  const parsed = checkoutSchema.safeParse({
    name: String(data?.get('name') ?? name.value),
    phone: String(data?.get('phone') ?? phone.value),
    address: composedAddress,
    paymentMethod: 'card',
    invoice: data?.get('invoice') ?? invoice.value,
    invoiceCarrier: carrier,
    packagePlanCode: selectedPackage.value.package_plan_code
  })

  if (!parsed.success) {
    const addressIssue = parsed.error.issues.some(issue => issue.path[0] === 'address')
    error.value = addressIssue ? t('checkout.error') : t('checkout.invalidCarrier')
    return
  }

  payPhase.value = 'paying'
  error.value = ''

  const pkg = selectedPackage.value
  try {
    const created = await api.createOrder({
      packagePlanCode: parsed.data.packagePlanCode,
      packageName: pkg.package_plan_name,
      amount: pkg.price,
      productCodes: pkg.items.map(item => item.code || item.sellable_item_id),
      productNames: pkg.items.map(item => item.name ?? item.code),
      paymentMethod: 'card',
      invoice: parsed.data.invoice,
      invoiceCarrier: parsed.data.invoiceCarrier,
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
    })

    const redirectUrl = 'payment' in created && created.payment?.redirect_url
      ? created.payment.redirect_url
      : null
    if (redirectUrl) {
      journey.clearSession()
      window.location.assign(redirectUrl)
      return
    }

    await new Promise(resolve => setTimeout(resolve, PAY_HOLD_MS))
    payPhase.value = 'success'
    journey.clearSession()
  } catch (err) {
    payPhase.value = 'form'
    if (err instanceof CandorApiError) {
      if (err.errorCode === 'composition_changed') {
        const packageData = (err.errorData as { package?: RecommendationPackage } | null)?.package
        if (packageData) {
          applyCompositionChanged(packageData)
          return
        }
      }
      if (err.errorCode === 'invalid_invoice_carrier') {
        error.value = t('checkout.invalidCarrier')
        return
      }
      if (err.errorCode === 'report_not_ready') {
        error.value = t('checkout.reportNotReady')
        return
      }
      error.value = err.message || t('checkout.errorGeneric')
      return
    }
    error.value = t('checkout.errorGeneric')
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
