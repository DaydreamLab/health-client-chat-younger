<template>
  <div>
    <div
      v-if="payPhase === 'paying'"
      class="flex min-h-[calc(100dvh-8rem)] flex-col items-center justify-center px-4 text-center"
      :data-testid="isExpertPlan ? 'expert-plan-checkout-processing' : 'checkout-processing'"
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
      :data-testid="isExpertPlan ? 'expert-plan-checkout-success' : 'checkout-success'"
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
        {{ isExpertPlan ? $t('expertPlans.paidAwaitingBody') : $t('checkout.successBody') }}
      </p>
      <AppButton
        class="mt-8 w-full"
        :to="localePath(successOrderPath)"
        :data-testid="isExpertPlan ? 'expert-plan-view-order' : 'checkout-view-orders'"
      >
        {{ $t('checkout.viewOrders') }}
      </AppButton>
    </div>

    <section
      v-else-if="pageGate === 'case_exists'"
      class="mx-auto max-w-lg rounded-2xl border border-default bg-elevated p-8 text-center"
      data-testid="checkout-case-exists"
    >
      <p class="text-3xl text-warning">
        !
      </p>
      <p class="mt-4 text-sm leading-relaxed text-muted">
        {{ $t('expertPlans.caseExists') }}
      </p>
      <AppButton
        class="mt-6 w-full"
        :to="chatBackPath"
        data-testid="checkout-case-exists-back"
      >
        {{ $t('expertPlans.backToChat') }}
      </AppButton>
    </section>

    <section
      v-else-if="pageGate === 'checkout_locked'"
      class="mx-auto max-w-lg rounded-2xl border border-default bg-elevated p-8 text-center"
      data-testid="checkout-locked"
    >
      <p class="text-3xl text-warning">
        !
      </p>
      <p class="mt-4 text-sm leading-relaxed text-muted">
        {{ $t('expertPlans.checkoutLocked') }}
      </p>
      <AppButton
        class="mt-6 w-full"
        :to="chatBackPath"
        data-testid="checkout-locked-back"
      >
        {{ $t('expertPlans.backToChat') }}
      </AppButton>
    </section>

    <section
      v-else-if="pageGate === 'empty_catalog'"
      class="mx-auto max-w-lg rounded-2xl border border-default bg-elevated p-8 text-center"
      data-testid="checkout-empty-catalog"
    >
      <p class="text-3xl text-warning">
        !
      </p>
      <p class="mt-4 text-sm leading-relaxed text-muted">
        {{ $t('expertPlans.empty') }}
      </p>
      <AppButton
        class="mt-6 w-full"
        :to="chatBackPath"
        data-testid="checkout-empty-catalog-back"
      >
        {{ $t('expertPlans.backToChat') }}
      </AppButton>
    </section>

    <div
      v-else
      class="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]"
      :data-testid="isExpertPlan ? 'expert-plans-page' : 'checkout-page'"
    >
      <div class="space-y-6">
        <section class="rounded-2xl border border-default bg-elevated p-5">
          <h1
            class="text-xl font-semibold text-highlighted"
            :data-testid="isExpertPlan ? 'expert-plans-title' : 'checkout-package-title'"
          >
            {{ $t('checkout.title') }}
          </h1>
          <p
            v-if="isExpertPlan"
            class="mt-2 text-sm text-muted"
          >
            {{ $t('expertPlans.lead') }}
          </p>

          <MemberAuthGate
            v-if="auth.ready && !auth.isMember"
            class="mt-6"
            :title="$t('checkout.memberRequired')"
            :hint="$t('checkout.memberRequiredHint')"
            icon="i-lucide-clipboard-list"
            test-id="expert-plans-auth-gate"
            login-test-id="expert-plans-login"
            register-test-id="expert-plans-register"
            back-to-chat-test-id="expert-plans-back-chat"
          />

          <template v-else-if="isExpertPlan">
            <h2 class="mt-6 text-sm font-medium text-highlighted">
              {{ $t('expertPlans.pickSection') }}
            </h2>
            <p
              v-if="listPending"
              class="mt-4 text-sm text-muted"
              data-testid="expert-plans-loading"
            >
              {{ $t('expertPlans.loading') }}
            </p>
            <p
              v-else-if="listError"
              class="mt-4 text-sm text-error"
              data-testid="expert-plans-error"
            >
              {{ listError }}
            </p>
            <div
              v-else
              class="mt-4 grid gap-3"
              data-testid="expert-plans-list"
            >
              <label
                v-for="plan in plans"
                :key="plan.code"
                class="app-path-card"
                :class="{ 'app-path-card-selected': selectedCode === plan.code }"
                :data-testid="`expert-plan-${plan.code}`"
              >
                <input
                  v-model="selectedCode"
                  type="radio"
                  class="sr-only"
                  name="expert-plan"
                  :value="plan.code"
                >
                <div class="flex items-start justify-between gap-2">
                  <p class="font-medium text-highlighted">
                    {{ plan.name_zh }}
                  </p>
                  <p class="shrink-0 text-lg font-semibold tabular-nums text-primary">
                    {{ formatTwd(plan.price) }}
                  </p>
                </div>
              </label>
            </div>
            <p
              v-if="selectedPlan"
              class="mt-3 text-sm text-muted"
            >
              {{ $t('expertPlans.planHint') }}
            </p>
          </template>

          <template v-else>
            <div class="mt-4 flex flex-wrap items-start justify-between gap-2">
              <h2 class="text-sm font-medium text-highlighted">
                {{ $t('expertPlans.packageSection') }}
              </h2>
              <NuxtLink
                class="text-sm font-semibold text-primary hover:underline"
                :to="recommendationsPath"
                data-testid="checkout-change-package"
              >
                {{ $t('expertPlans.changePackage') }}
              </NuxtLink>
            </div>
            <p
              v-if="packagePending"
              class="mt-3 text-sm text-muted"
              data-testid="checkout-package-loading"
            >
              {{ $t('recommendation.recoLoading') }}
            </p>
            <p
              v-else-if="packageError"
              class="mt-3 text-sm text-error"
              data-testid="checkout-package-error"
            >
              {{ packageError }}
            </p>
            <div
              v-else-if="selectedPackage"
              class="mt-3 rounded-xl border border-default bg-default/40 p-4"
              data-testid="checkout-package-summary"
            >
              <div class="flex items-start justify-between gap-2">
                <p class="font-medium text-highlighted">
                  {{ selectedPackage.package_plan_name }}
                </p>
                <p class="shrink-0 text-lg font-semibold tabular-nums text-primary">
                  {{ $t('recommendation.perMonth', { price: formatTwd(selectedPackage.price) }) }}
                </p>
              </div>
              <p class="mt-1 text-sm text-muted">
                {{ $t('recommendation.itemCountHint', { count: selectedPackage.items.length }) }}
              </p>
            </div>
          </template>
        </section>
      </div>

      <aside
        v-if="auth.isMember && (isExpertPlan ? selectedPlan : selectedPackage)"
        class="relative h-fit max-h-none rounded-2xl border border-default bg-elevated p-5 lg:sticky lg:top-6 lg:max-h-[calc(100dvh-5.5rem)] lg:overflow-y-auto"
        :data-testid="isExpertPlan ? 'expert-plan-checkout-card' : 'checkout-card'"
      >
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
            <dd
              class="text-highlighted"
              data-testid="checkout-shipping-free"
            >
              {{ $t('checkout.shippingFree') }}
            </dd>
          </div>
          <div class="flex justify-between gap-3 border-t border-default pt-2 font-medium">
            <dt class="text-highlighted">
              {{ $t('checkout.total') }}
            </dt>
            <dd
              class="tabular-nums text-primary"
              :data-testid="isExpertPlan ? 'expert-plan-checkout-total' : 'checkout-total'"
            >
              {{ formatTwd(checkoutPrice) }}
            </dd>
          </div>
        </dl>

        <form
          class="mt-5 space-y-4"
          @submit.prevent="onPay"
        >
          <p
            v-if="showRecipientPrefillHint"
            class="text-xs text-muted"
            data-testid="checkout-recipient-prefill-hint"
          >
            {{ $t('expertPlans.recipientPrefillHint') }}
          </p>

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
          <label class="flex items-center gap-2 text-sm text-highlighted">
            <input
              v-model="saveAsDefaultAddress"
              type="checkbox"
              name="save_default_address"
              class="accent-primary"
              data-testid="checkout-save-default-address"
            >
            {{ $t('checkout.saveDefaultAddress') }}
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
              class="flex flex-wrap items-center gap-2 text-sm text-highlighted"
              :class="{ 'opacity-60': method !== 'card' }"
            >
              <input
                v-model="paymentMethod"
                type="radio"
                class="accent-primary"
                name="payment"
                :value="method"
                :disabled="method !== 'card'"
              >
              {{ $t(`checkout.${method}`) }}
              <span
                v-if="method !== 'card'"
                class="text-xs text-muted"
                :data-testid="`checkout-payment-${method}-coming-soon`"
              >
                {{ $t('checkout.paymentComingSoon') }}
              </span>
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
            :data-testid="isExpertPlan ? 'expert-plan-checkout-error' : 'checkout-error'"
          >
            {{ error }}
          </p>

          <AppButton
            type="submit"
            class="w-full"
            :disabled="!canCheckout"
            :data-testid="isExpertPlan ? 'expert-plan-checkout-submit' : 'checkout-submit'"
          >
            {{ $t('checkout.submit') }}
          </AppButton>
        </form>
      </aside>
    </div>

    <Teleport to="body">
      <div
        v-if="showDelistedModal"
        class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
        data-testid="checkout-delisted-modal"
        role="dialog"
        aria-modal="true"
      >
        <article class="w-full max-w-sm rounded-2xl border border-default bg-elevated p-5 shadow-xl">
          <h2 class="text-lg font-semibold text-highlighted">
            {{ $t('expertPlans.delistedTitle') }}
          </h2>
          <p class="mt-2 text-sm text-muted">
            {{ $t('expertPlans.delistedBody') }}
          </p>
          <AppButton
            class="mt-6 w-full"
            data-testid="checkout-delisted-dismiss"
            @click="onDelistedDismiss"
          >
            {{ $t('expertPlans.delistedReselect') }}
          </AppButton>
        </article>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { checkoutSchema, expertPlanCheckoutSchema } from '~/utils/checkout-schema'
import type {
  ExpertPlan,
  RecommendationPackage,
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
import { recommendationRequestFromJourney } from '~/utils/recommendation-request'
import { recommendationFromExpertReview } from '~/utils/expert-review'

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

type CheckoutKind = 'expert_plan' | 'package'
type PageGate = 'none' | 'case_exists' | 'checkout_locked' | 'empty_catalog'

const checkoutKind = computed<CheckoutKind>(() => {
  const raw = route.query.kind
  const value = Array.isArray(raw) ? raw[0] : raw
  return value === 'package' ? 'package' : 'expert_plan'
})
const isExpertPlan = computed(() => checkoutKind.value === 'expert_plan')

const pageGate = ref<PageGate>('none')
const plans = ref<ExpertPlan[]>([])
const listPending = ref(true)
const listError = ref('')
const selectedCode = ref('')
const packagePending = ref(false)
const packageError = ref('')
const recommendation = ref<RecommendationResponse | null>(null)
const selectedPackageCode = ref('')
const showDelistedModal = ref(false)
const showRecipientPrefillHint = ref(false)

const name = ref(auth.displayName)
const phone = ref('')
const addressCity = ref('')
const addressDistrict = ref('')
const addressDetail = ref('')
const saveAsDefaultAddress = ref(false)
const hydratingAddress = ref(false)
const taiwanCities = TAIWAN_CITIES
const addressDistricts = computed(() => districtsForCity(addressCity.value))
const delivery = ref<'home'>('home')
const paymentMethod = ref<PaymentMethod>('card')
const invoice = ref<InvoiceType>('member')
const invoiceCarrier = ref('')
const invoiceOptions: InvoiceType[] = ['member', 'cloud', 'company', 'donate']
const payPhase = ref<'form' | 'paying' | 'success'>('form')
const error = ref('')
const createdOrderId = ref('')

const DEFAULT_PAYMENT_METHODS: PaymentMethod[] = ['card', 'linepay', 'atm']
const paymentMethods = ref<PaymentMethod[]>([...DEFAULT_PAYMENT_METHODS])

const chatBackPath = computed(() => localePath('/chat'))
const recommendationsPath = computed(() => {
  const raw = route.query.flow
  const flow = Array.isArray(raw) ? raw[0] : raw
  if (flow === 'standard') {
    return localePath('/app/recommendations?flow=standard')
  }
  return localePath('/app/recommendations')
})

const selectedPlan = computed(() =>
  plans.value.find(plan => plan.code === selectedCode.value) ?? null
)
const packages = computed(() => recommendation.value?.packages ?? [])
const selectedPackage = computed(() =>
  packages.value.find(pkg => pkg.package_plan_code === selectedPackageCode.value) ?? null
)
const checkoutPrice = computed(() =>
  isExpertPlan.value
    ? (selectedPlan.value?.price ?? 0)
    : (selectedPackage.value?.price ?? 0)
)

const recipientReady = computed(() =>
  name.value.trim() !== ''
  && phone.value.trim().length >= 8
  && addressCity.value.trim() !== ''
  && addressDistrict.value.trim() !== ''
  && addressDetail.value.trim() !== ''
)

const canCheckout = computed(() => {
  if (!auth.isMember || !recipientReady.value) {
    return false
  }
  if (isExpertPlan.value) {
    const conversationId = journey.conversationId?.trim() ?? ''
    return Boolean(
      selectedPlan.value
      && conversationId
      && pageGate.value === 'none'
    )
  }
  const pkg = selectedPackage.value
  return Boolean(
    pkg
    && pkg.items.length > 0
    && pkg.composition_hash
  )
})

const successOrderPath = computed(() =>
  createdOrderId.value
    ? `/app/orders/${createdOrderId.value}`
    : '/app/orders'
)

function sortExpertPlans(rows: ExpertPlan[]): ExpertPlan[] {
  return [...rows].sort((left, right) => {
    const leftOrder = left.sort_order ?? 0
    const rightOrder = right.sort_order ?? 0
    if (leftOrder !== rightOrder) {
      return leftOrder - rightOrder
    }
    return left.name_zh.localeCompare(right.name_zh, 'zh-Hant')
  })
}

function isStandardFlow(): boolean {
  const raw = route.query.flow
  if (Array.isArray(raw)) {
    return raw.includes('standard')
  }
  return raw === 'standard'
}

watch(addressCity, () => {
  if (hydratingAddress.value) {
    return
  }
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

async function loadPaymentMethods() {
  try {
    const config = await candor.getClientConfig()
    const methods = (config.payment_methods ?? [])
      .filter((m): m is PaymentMethod => m === 'card' || m === 'linepay' || m === 'atm')
    if (methods.length > 0) {
      paymentMethods.value = methods
      if (!methods.includes(paymentMethod.value)) {
        paymentMethod.value = methods[0] ?? 'card'
      }
    }
  } catch {
    paymentMethods.value = [...DEFAULT_PAYMENT_METHODS]
  }
}

async function loadDefaultRecipient() {
  if (!auth.isMember) {
    return
  }
  try {
    const me = await candor.me()
    const recipient = me.default_recipient
    if (!recipient) {
      return
    }
    hydratingAddress.value = true
    if (recipient.name) {
      name.value = recipient.name
    }
    if (recipient.phone) {
      phone.value = recipient.phone
    }
    if (recipient.address_city) {
      addressCity.value = recipient.address_city
    }
    await nextTick()
    if (recipient.address_district) {
      addressDistrict.value = recipient.address_district
    }
    if (recipient.address_detail) {
      addressDetail.value = recipient.address_detail
    }
    saveAsDefaultAddress.value = true
    showRecipientPrefillHint.value = true
  } catch {
    // keep empty form
  } finally {
    hydratingAddress.value = false
  }
}

async function loadExpertGate() {
  pageGate.value = 'none'
  if (!isExpertPlan.value) {
    return
  }
  const conversationId = journey.conversationId?.trim() ?? ''
  if (!conversationId) {
    return
  }
  try {
    const review = await candor.getExpertReview(conversationId)
    if (review.order_id) {
      pageGate.value = 'checkout_locked'
      return
    }
    pageGate.value = 'case_exists'
  } catch (err) {
    if (err instanceof CandorApiError && err.errorCode === 'not_found') {
      pageGate.value = 'none'
      return
    }
    pageGate.value = 'none'
  }
}

async function loadPlans(options: { skipPreselect?: boolean } = {}) {
  listPending.value = true
  listError.value = ''
  try {
    const payload = await candor.listExpertPlans()
    const rows = Array.isArray(payload.expert_plans) ? payload.expert_plans : []
    plans.value = sortExpertPlans(rows.filter(plan => plan.active !== false))
    if (options.skipPreselect) {
      selectedCode.value = ''
    } else {
      const preferred = typeof route.query.code === 'string' ? route.query.code : ''
      const match = plans.value.find(plan => plan.code === preferred)
      if (match) {
        selectedCode.value = match.code
      } else if (plans.value.length === 1) {
        selectedCode.value = plans.value[0]?.code ?? ''
      } else {
        selectedCode.value = ''
      }
    }
    if (plans.value.length === 0 && pageGate.value === 'none') {
      pageGate.value = 'empty_catalog'
    }
  } catch {
    plans.value = []
    listError.value = t('expertPlans.loadError')
  } finally {
    listPending.value = false
  }
}

async function loadLegacyPackageRecommendation() {
  packagePending.value = true
  packageError.value = ''
  try {
    const result = await candor.createRecommendation(
      recommendationRequestFromJourney({
        conversationId: journey.conversationId,
        reportId: journey.reportId
      })
    )
    recommendation.value = result
    const preferred = journey.selectedPackageCode
    const match = result.packages.find(pkg => pkg.package_plan_code === preferred)
    selectedPackageCode.value = match?.package_plan_code ?? result.packages[0]?.package_plan_code ?? ''
  } catch {
    packageError.value = t('recommendation.recoError')
    recommendation.value = null
  } finally {
    packagePending.value = false
  }
}

async function loadPackageRecommendation() {
  if (isStandardFlow()) {
    await loadLegacyPackageRecommendation()
    return
  }
  const conversationId = journey.conversationId?.trim() ?? ''
  if (!conversationId || !auth.isMember) {
    await loadLegacyPackageRecommendation()
    return
  }
  packagePending.value = true
  packageError.value = ''
  try {
    const review = await candor.getExpertReview(conversationId)
    if (review.status !== 'reviewed') {
      packageError.value = t('recommendation.recoError')
      recommendation.value = null
      return
    }
    const mapped = recommendationFromExpertReview(review)
    if (!mapped || mapped.packages.length === 0) {
      packageError.value = t('recommendation.recoError')
      recommendation.value = null
      return
    }
    recommendation.value = mapped
    const preferred = journey.selectedPackageCode
    const match = mapped.packages.find(pkg => pkg.package_plan_code === preferred)
    selectedPackageCode.value = match?.package_plan_code ?? mapped.packages[0]?.package_plan_code ?? ''
  } catch (err) {
    if (err instanceof CandorApiError && (err.errorCode === 'not_found' || err.errorCode === 'member_required')) {
      await loadLegacyPackageRecommendation()
      return
    }
    packageError.value = t('recommendation.recoError')
    recommendation.value = null
  } finally {
    packagePending.value = false
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

async function onDelistedDismiss() {
  showDelistedModal.value = false
  await loadPlans({ skipPreselect: true })
}

function isDelistedError(code: string): boolean {
  return code === 'expert_plan_inactive'
    || code === 'expert_plan_delisted'
    || code === 'expert_plan_not_found'
}

async function onPay(event: Event) {
  if (!auth.isMember) {
    error.value = t('checkout.memberRequired')
    return
  }
  if (!canCheckout.value) {
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

  payPhase.value = 'paying'
  error.value = ''

  try {
    if (isExpertPlan.value && selectedPlan.value) {
      const conversationId = journey.conversationId?.trim() ?? ''
      if (!conversationId) {
        payPhase.value = 'form'
        error.value = t('expertPlans.conversationRequired')
        return
      }
      const parsed = expertPlanCheckoutSchema.safeParse({
        name: String(data?.get('name') ?? name.value),
        phone: String(data?.get('phone') ?? phone.value),
        address: composedAddress,
        paymentMethod: 'card',
        invoice: data?.get('invoice') ?? invoice.value,
        invoiceCarrier: carrier,
        expertPlanCode: selectedPlan.value.code
      })
      if (!parsed.success) {
        payPhase.value = 'form'
        const addressIssue = parsed.error.issues.some(issue => issue.path[0] === 'address')
        error.value = addressIssue ? t('checkout.error') : t('checkout.invalidCarrier')
        return
      }

      const created = await api.createExpertPlanOrder({
        expertPlanCode: parsed.data.expertPlanCode,
        expertPlanName: selectedPlan.value.name_zh,
        amount: selectedPlan.value.price,
        paymentMethod: 'card',
        invoice: parsed.data.invoice,
        invoiceCarrier: parsed.data.invoiceCarrier,
        recipient: {
          name: parsed.data.name,
          phone: parsed.data.phone,
          address: parsed.data.address,
          email: auth.user?.email ?? ''
        },
        conversationId
      })

      await maybeSaveDefaultAddress(data, parsed.data.name, parsed.data.phone)

      createdOrderId.value = created.id
      const redirectUrl = created.payment?.redirect_url
      if (redirectUrl) {
        window.location.assign(redirectUrl)
        return
      }
      await new Promise(resolve => setTimeout(resolve, PAY_HOLD_MS))
      await navigateTo(localePath(`/app/orders/${created.id}`))
      return
    }

    if (!selectedPackage.value) {
      payPhase.value = 'form'
      error.value = t('checkout.error')
      return
    }

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
      payPhase.value = 'form'
      const addressIssue = parsed.error.issues.some(issue => issue.path[0] === 'address')
      error.value = addressIssue ? t('checkout.error') : t('checkout.invalidCarrier')
      return
    }

    const pkg = selectedPackage.value
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

    await maybeSaveDefaultAddress(data, parsed.data.name, parsed.data.phone)

    createdOrderId.value = created.id
    const redirectUrl = created.payment?.redirect_url
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
      if (isExpertPlan.value && isDelistedError(err.errorCode)) {
        showDelistedModal.value = true
        return
      }
      if (err.errorCode === 'expert_review_exists') {
        pageGate.value = 'case_exists'
        return
      }
      if (err.errorCode === 'expert_plan_checkout_locked') {
        pageGate.value = 'checkout_locked'
        return
      }
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

async function maybeSaveDefaultAddress(
  data: FormData | null,
  recipientName: string,
  recipientPhone: string
) {
  if (!saveAsDefaultAddress.value || !auth.isMember) {
    return
  }
  try {
    await candor.patchMe({
      default_recipient: {
        name: recipientName,
        phone: recipientPhone,
        address_city: String(data?.get('address_city') ?? addressCity.value).trim(),
        address_district: String(data?.get('address_district') ?? addressDistrict.value).trim(),
        address_detail: String(data?.get('address_detail') ?? addressDetail.value).trim()
      }
    })
  } catch {
    // order already placed
  }
}

onMounted(async () => {
  void loadPaymentMethods()
  void loadDefaultRecipient()
  if (isExpertPlan.value) {
    await loadExpertGate()
    if (pageGate.value === 'none') {
      await loadPlans()
    }
  } else {
    await loadPackageRecommendation()
  }
})
</script>
