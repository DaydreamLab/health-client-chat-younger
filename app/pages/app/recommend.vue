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
      <section class="rounded-2xl border border-default bg-elevated p-5">
        <h1 class="text-xl font-semibold text-highlighted">
          {{ $t('shop.title') }}
        </h1>
        <p class="mt-1 text-sm text-muted">
          {{ $t('shop.subtitle') }}
        </p>
        <div class="mt-4">
          <h2 class="font-semibold text-highlighted">
            {{ $t('labChart.title') }}
          </h2>
          <p class="mt-1 text-sm text-dimmed">
            {{ $t('labChart.hint') }}
          </p>
          <div class="mt-3">
            <LabBarChart />
          </div>
        </div>
      </section>

      <section
        v-for="section in itemSections"
        :key="section.id"
        class="overflow-hidden rounded-2xl border border-default bg-elevated"
      >
        <div
          class="border-b border-default px-5 py-4"
          :class="section.id === 'plus' ? 'bg-muted' : undefined"
        >
          <h2 class="font-semibold text-highlighted">
            {{ $t(`shop.${section.id}Title`) }}
          </h2>
          <p class="mt-1 text-sm text-muted">
            {{ $t(`shop.${section.id}Hint`) }}
          </p>
        </div>
        <ul class="divide-y divide-default">
          <li
            v-for="item in section.items"
            :key="item.id"
          >
            <button
              type="button"
              class="flex w-full items-start gap-3 px-5 py-4 text-start transition hover:bg-muted focus-visible:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary/40"
              :data-testid="`shop-item-${item.id}`"
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
                  {{ $t(`shop.items.${item.id}.name`) }}
                </span>
                <span class="mt-1 block text-sm text-muted">
                  {{ $t(`shop.items.${item.id}.need`) }}
                </span>
              </span>
              <span class="flex shrink-0 flex-col items-end gap-1">
                <span
                  class="app-badge app-badge-pending"
                  :data-testid="`shop-dose-${item.id}`"
                >
                  {{ $t('shop.doseLocked', { count: item.dailyDose }) }}
                </span>
                <span class="text-sm tabular-nums text-muted">
                  {{ formatTwd(item.monthlyCost) }}
                </span>
              </span>
            </button>
          </li>
        </ul>
      </section>

      <section class="rounded-2xl border border-default bg-elevated p-5">
        <h2 class="font-semibold text-highlighted">
          {{ $t('shop.planPick') }}
        </h2>
        <div class="mt-4 grid gap-3 sm:grid-cols-2">
          <label
            v-for="plan in planOptions"
            :key="plan.id"
            class="app-path-card"
            :class="{ 'app-path-card-selected': journey.selectedPlanId === plan.id }"
            :data-testid="`shop-plan-${plan.id}`"
          >
            <input
              v-model="journey.selectedPlanId"
              type="radio"
              class="sr-only"
              name="recommend-plan"
              :value="plan.id"
            >
            <div class="flex items-start justify-between gap-2">
              <p class="font-medium text-highlighted">
                {{ $t(`shop.${plan.id}`) }}
              </p>
              <span
                v-if="plan.id === 'fullTune'"
                class="app-badge app-badge-demo"
              >
                {{ $t('shop.recommended') }}
              </span>
            </div>
            <p class="mt-2 text-lg font-semibold text-primary">
              {{ $t('shop.perMonth', { price: formatTwd(plan.price) }) }}
            </p>
            <p class="mt-1 text-sm text-muted">
              {{ $t(`shop.${plan.id}Hint`, { count: plan.itemIds.length }) }}
            </p>
          </label>
        </div>
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
            {{ formatTwd(selectedPlan.price) }}
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
            {{ formatTwd(selectedPlan.price) }}
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
          data-testid="checkout-submit"
        >
          {{ $t('checkout.submit') }}
        </AppButton>
      </form>
    </aside>

    <SupplementDetailModal
      :item="detail"
      @close="detail = null"
    />
  </div>
</template>

<script setup lang="ts">
import { checkoutSchema } from '~/utils/checkout-schema'
import {
  formatTwd,
  itemsForPlan,
  supplementPlans,
  type ChatMessage,
  type InvoiceType,
  type PaymentMethod,
  type SupplementItem
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

const name = ref(auth.displayName)
const phone = ref('')
const address = ref('')
const delivery = ref<'home'>('home')
const paymentMethod = ref<PaymentMethod>('card')
const invoice = ref<InvoiceType>('cloud')
const payPhase = ref<'form' | 'paying' | 'success'>('form')
const error = ref('')
const detail = ref<SupplementItem | null>(null)

const paymentMethods: PaymentMethod[] = ['card', 'linepay', 'atm']
const invoiceOptions: InvoiceType[] = ['cloud', 'company', 'donate']
const planOptions = Object.values(supplementPlans)

const selectedPlan = computed(() => supplementPlans[journey.selectedPlanId])
const selectedItems = computed(() => itemsForPlan(journey.selectedPlanId))
const itemSections = computed(() => {
  const core = selectedItems.value.filter(item => item.tier === 'core')
  const plus = selectedItems.value.filter(item => item.tier === 'plus')
  const sections: Array<{ id: 'core' | 'plus', items: SupplementItem[] }> = [
    { id: 'core', items: core }
  ]

  if (plus.length) {
    sections.push({ id: 'plus', items: plus })
  }

  return sections
})

async function onPay(event: Event) {
  const form = event.target
  const data = form instanceof HTMLFormElement ? new FormData(form) : null
  const parsed = checkoutSchema.safeParse({
    name: String(data?.get('name') ?? name.value),
    phone: String(data?.get('phone') ?? phone.value),
    address: String(data?.get('address') ?? address.value),
    paymentMethod: data?.get('payment') ?? paymentMethod.value,
    invoice: data?.get('invoice') ?? invoice.value,
    planId: journey.selectedPlanId
  })

  if (!parsed.success) {
    error.value = t('checkout.error')
    return
  }

  payPhase.value = 'paying'
  error.value = ''

  try {
    await Promise.all([
      api.createOrder({
        planId: parsed.data.planId,
        paymentMethod: parsed.data.paymentMethod,
        invoice: parsed.data.invoice,
        recipient: {
          name: parsed.data.name,
          phone: parsed.data.phone,
          address: parsed.data.address,
          email: auth.user?.email ?? ''
        },
        messages: JSON.parse(JSON.stringify(journey.snapshotMessages())) as ChatMessage[]
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
  void api.getCatalog()
  if (!journey.hasAnalysis) {
    journey.hasAnalysis = true
  }
})
</script>
