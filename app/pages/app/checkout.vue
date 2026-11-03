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
        {{ checkoutLockedMessage }}
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

    <section
      v-else-if="pageGate === 'conversation_missing'"
      class="mx-auto max-w-lg rounded-2xl border border-default bg-elevated p-8 text-center"
      data-testid="checkout-conversation-missing"
    >
      <p class="text-3xl text-warning">
        !
      </p>
      <p class="mt-4 text-sm leading-relaxed text-muted">
        {{ $t('checkout.conversationMissing') }}
      </p>
      <AppButton
        class="mt-6 w-full"
        :to="chatBackPath"
        data-testid="checkout-conversation-missing-back"
      >
        {{ $t('expertPlans.backToChat') }}
      </AppButton>
    </section>

    <section
      v-else-if="pageGate === 'questionnaire_incomplete'"
      class="mx-auto max-w-lg rounded-2xl border border-default bg-elevated p-8 text-center"
      data-testid="checkout-questionnaire-incomplete"
      :data-missing-count="questionnaireMissing.length"
    >
      <p class="text-3xl text-warning">
        !
      </p>
      <p class="mt-4 text-sm leading-relaxed text-muted">
        {{ $t('checkout.questionnaireIncomplete') }}
      </p>
      <AppButton
        class="mt-6 w-full"
        data-testid="checkout-questionnaire-incomplete-back"
        @click="onQuestionnaireBackToChat"
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
            test-id="checkout-auth-gate"
            login-test-id="checkout-login"
            register-test-id="checkout-register"
            back-to-chat-test-id="checkout-back-chat"
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
              {{ shippingFree ? $t('checkout.shippingFree') : formatTwd(shippingFee) }}
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
              {{ $t('checkout.payment.label') }}
            </legend>
            <label
              v-for="method in paymentMethodRows"
              :key="method.code"
              class="flex flex-wrap items-center gap-2 text-sm text-highlighted"
              :class="{ 'opacity-60': !method.available }"
            >
              <input
                v-model="paymentMethod"
                type="radio"
                class="accent-primary"
                name="payment"
                :value="method.code"
                :disabled="!method.available"
              >
              {{ $t(`checkout.${method.code}`) }}
              <span
                v-if="method.comingSoon"
                class="text-xs text-muted"
                :data-testid="`checkout-payment-${method.code}-coming-soon`"
              >
                {{ $t('checkout.payment.coming_soon') }}
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
            {{ $t('checkout.expert_plan_inactive') }}
          </h2>
          <p class="mt-2 text-sm text-muted">
            {{ $t('checkout.expert_plan_inactive_body') }}
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
  CheckoutLockReason,
  CheckoutPreview,
  CheckoutPreviewAiPackage,
  CheckoutPreviewPaymentMethod,
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
  isQuestionnaireIncompleteError,
  parseQuestionnaireIncompleteData
} from '~/utils/questionnaire-incomplete'
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

type CheckoutKind = 'expert_plan' | 'package'
type PageGate
  = 'none'
    | 'case_exists'
    | 'checkout_locked'
    | 'empty_catalog'
    | 'conversation_missing'
    | 'questionnaire_incomplete'

const checkoutKind = computed<CheckoutKind>(() => {
  const raw = route.query.kind
  const value = Array.isArray(raw) ? raw[0] : raw
  return value === 'package' ? 'package' : 'expert_plan'
})
const isExpertPlan = computed(() => checkoutKind.value === 'expert_plan')

const pageGate = ref<PageGate>('none')
const checkoutLockReason = ref<CheckoutLockReason | null>(null)
/** core #145 `missing_fields`; kept for follow-up UI — not rendered yet. */
const questionnaireMissing = ref<string[]>([])
/** Prefer error_data.conversation_id when returning to chat. */
const questionnaireConversationId = ref<string | null>(null)
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
const shippingFree = ref(true)
const shippingFee = ref(0)

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

interface PaymentMethodRow {
  code: PaymentMethod
  available: boolean
  comingSoon: boolean
}

const DEFAULT_PAYMENT_METHODS: PaymentMethodRow[] = [
  { code: 'card', available: true, comingSoon: false },
  { code: 'linepay', available: false, comingSoon: true },
  { code: 'atm', available: false, comingSoon: true }
]
const paymentMethodRows = ref<PaymentMethodRow[]>([...DEFAULT_PAYMENT_METHODS])

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

const checkoutLockedMessage = computed(() => {
  if (checkoutLockReason.value === 'case_finalized') {
    return t('expertPlans.checkoutLockedCaseFinalized')
  }
  if (checkoutLockReason.value === 'order_submitted') {
    return t('expertPlans.checkoutLockedOrderSubmitted')
  }
  return t('expertPlans.checkoutLocked')
})

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

function resolvePackagePlanCode(): string {
  const raw = route.query.package_plan_code ?? route.query.code
  const value = Array.isArray(raw) ? raw[0] : raw
  if (typeof value === 'string' && value.trim()) {
    return value.trim()
  }
  return journey.selectedPackageCode?.trim() ?? ''
}

function aiPackageFromPreview(ai: CheckoutPreviewAiPackage): RecommendationPackage {
  return {
    package_plan_code: ai.package_plan_code,
    package_plan_name: ai.package_plan_name,
    price: ai.price,
    period_days: ai.period_days ?? 30,
    items: Array.isArray(ai.items) ? ai.items : [],
    used_amount: ai.used_amount ?? 0,
    remaining: ai.remaining ?? 0,
    composition_hash: ai.composition_hash ?? ''
  }
}

function recommendationShell(packages: RecommendationPackage[]): RecommendationResponse {
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

function applyPaymentMethodsFromPreview(methods: CheckoutPreviewPaymentMethod[]) {
  const rows = methods
    .filter(m => m.code === 'card' || m.code === 'linepay' || m.code === 'atm')
    .map(m => ({
      code: m.code as PaymentMethod,
      available: m.available,
      comingSoon: m.status === 'coming_soon' || !m.available
    }))
  if (rows.length > 0) {
    paymentMethodRows.value = rows
    const firstAvailable = rows.find(row => row.available)
    paymentMethod.value = firstAvailable?.code ?? 'card'
  } else {
    paymentMethodRows.value = [...DEFAULT_PAYMENT_METHODS]
    paymentMethod.value = 'card'
  }
}

function applyRecipientFromPreview(recipient: CheckoutPreview['recipient']) {
  if (!recipient || typeof recipient !== 'object') {
    return
  }
  const row = recipient as Record<string, unknown>
  hydratingAddress.value = true
  const nameVal = row.name
  if (typeof nameVal === 'string' && nameVal.trim()) {
    name.value = nameVal
  }
  const phoneVal = row.phone
  if (typeof phoneVal === 'string' && phoneVal.trim()) {
    phone.value = phoneVal
  }
  const cityVal = row.address_city
  if (typeof cityVal === 'string' && cityVal.trim()) {
    addressCity.value = cityVal
  }
  void nextTick().then(() => {
    const districtVal = row.address_district
    if (typeof districtVal === 'string' && districtVal.trim()) {
      addressDistrict.value = districtVal
    }
    const detailVal = row.address_detail
    if (typeof detailVal === 'string' && detailVal.trim()) {
      addressDetail.value = detailVal
    }
    saveAsDefaultAddress.value = true
    showRecipientPrefillHint.value = true
    hydratingAddress.value = false
  })
}

function resolvePageGate(preview: CheckoutPreview): PageGate {
  if (preview.checkout_locked) {
    return 'checkout_locked'
  }
  if (preview.block?.code === 'expert_case_exists') {
    return 'case_exists'
  }
  if (preview.block?.code === 'no_expert_plans') {
    return 'empty_catalog'
  }
  return 'none'
}

function applyExpertPlansFromPreview(
  preview: CheckoutPreview,
  options: { skipPreselect?: boolean }
) {
  plans.value = sortExpertPlans(preview.expert_plans ?? [])
  if (options.skipPreselect) {
    selectedCode.value = ''
    return
  }
  const fromQuery = typeof route.query.code === 'string' ? route.query.code : ''
  const match = plans.value.find(plan => plan.code === fromQuery)
  if (match) {
    selectedCode.value = match.code
    return
  }
  const preselect = preview.preselect_expert_plan_code?.trim()
  selectedCode.value = preselect && plans.value.some(plan => plan.code === preselect)
    ? preselect
    : ''
}

function applyAiPreviewPackage(preview: CheckoutPreview) {
  const ai = preview.ai
  if (!ai || !Array.isArray(ai.items)) {
    packageError.value = t('recommendation.recoError')
    recommendation.value = null
    return
  }
  // Spec 33 / core #143: checkout uses preview.ai.items only — never POST /recommendations cache.
  const pkg = aiPackageFromPreview(ai)
  recommendation.value = recommendationShell([pkg])
  selectedPackageCode.value = pkg.package_plan_code
}

function applyQuestionnaireIncompleteGate(err: CandorApiError) {
  const parsed = parseQuestionnaireIncompleteData(err)
  questionnaireMissing.value = parsed.missingFields
  questionnaireConversationId.value = parsed.conversationId
    || journey.conversationId?.trim()
    || null
  pageGate.value = 'questionnaire_incomplete'
  recommendation.value = null
  plans.value = []
}

async function onQuestionnaireBackToChat() {
  const id = questionnaireConversationId.value?.trim()
    || journey.conversationId?.trim()
    || ''
  if (id) {
    journey.conversationId = id
  }
  await navigateTo(localePath('/chat'))
}

async function loadCheckoutPreview(options: { skipPreselect?: boolean } = {}) {
  pageGate.value = 'none'
  checkoutLockReason.value = null
  questionnaireMissing.value = []
  questionnaireConversationId.value = null
  listError.value = ''
  packageError.value = ''

  const conversationId = journey.conversationId?.trim() ?? ''
  if (!conversationId) {
    if (isExpertPlan.value) {
      listError.value = t('expertPlans.conversationRequired')
    } else if (auth.isMember) {
      // AI checkout without conversation — same screen as core 422 invalid_request.
      pageGate.value = 'conversation_missing'
      recommendation.value = null
    }
    // Guest without conversation still falls through to MemberAuthGate.
    listPending.value = false
    packagePending.value = false
    return
  }

  if (!auth.isMember) {
    listPending.value = false
    packagePending.value = false
    return
  }

  if (isExpertPlan.value) {
    listPending.value = true
  } else {
    packagePending.value = true
  }

  try {
    const packagePlanCode = resolvePackagePlanCode()
    if (!isExpertPlan.value && !packagePlanCode) {
      packageError.value = t('recommendation.recoError')
      return
    }

    const preview = await candor.getCheckoutPreview({
      conversationId,
      mode: isExpertPlan.value ? 'expert' : 'ai',
      packagePlanCode: isExpertPlan.value ? undefined : packagePlanCode
    })

    pageGate.value = resolvePageGate(preview)
    checkoutLockReason.value = preview.checkout_lock_reason ?? null
    shippingFree.value = preview.shipping?.free !== false
    shippingFee.value = preview.shipping?.fee ?? 0
    applyPaymentMethodsFromPreview(preview.payment_methods ?? [])
    applyRecipientFromPreview(preview.recipient)

    if (isExpertPlan.value) {
      applyExpertPlansFromPreview(preview, options)
      if (pageGate.value === 'none' && plans.value.length === 0) {
        pageGate.value = 'empty_catalog'
      }
    } else if (pageGate.value === 'none') {
      applyAiPreviewPackage(preview)
    }
  } catch (err) {
    if (isQuestionnaireIncompleteError(err)) {
      applyQuestionnaireIncompleteGate(err)
    } else if (
      !isExpertPlan.value
      && err instanceof CandorApiError
      && err.statusCode === 422
      && err.errorCode === 'invalid_request'
    ) {
      pageGate.value = 'conversation_missing'
      recommendation.value = null
    } else if (isExpertPlan.value) {
      listError.value = t('expertPlans.loadError')
      plans.value = []
    } else {
      packageError.value = t('recommendation.recoError')
      recommendation.value = null
    }
  } finally {
    listPending.value = false
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
  await loadCheckoutPreview({ skipPreselect: true })
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
    if (isQuestionnaireIncompleteError(err)) {
      applyQuestionnaireIncompleteGate(err)
      return
    }
    if (err instanceof CandorApiError) {
      if (isExpertPlan.value && isDelistedError(err.errorCode)) {
        showDelistedModal.value = true
        return
      }
      if (err.errorCode === 'expert_review_exists') {
        pageGate.value = 'case_exists'
        checkoutLockReason.value = null
        return
      }
      if (err.errorCode === 'expert_plan_checkout_locked') {
        pageGate.value = 'checkout_locked'
        checkoutLockReason.value = 'case_finalized'
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
  await loadCheckoutPreview()
})

watch(
  () => [
    checkoutKind.value,
    resolvePackagePlanCode(),
    journey.conversationId
  ] as const,
  async (next, prev) => {
    if (!prev) {
      return
    }
    if (next[0] === prev[0] && next[1] === prev[1] && next[2] === prev[2]) {
      return
    }
    await loadCheckoutPreview()
  }
)
</script>
