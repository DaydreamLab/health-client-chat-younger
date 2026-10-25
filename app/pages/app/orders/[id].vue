<template>
  <MemberAuthGate
    v-if="gateLocked"
    :title="$t('orders.guestRequired')"
    :hint="$t('orders.guestRequiredHint')"
    icon="i-lucide-package"
    test-id="order-detail-auth-gate"
    login-test-id="order-detail-login"
    register-test-id="order-detail-register"
    back-to-chat-test-id="order-detail-back-chat"
  />
  <MemberLoadingState
    v-else-if="loading"
    :message="$t('orders.loading')"
    test-id="order-detail-loading"
  />
  <MemberErrorState
    v-else-if="loadError"
    :message="$t('orders.emptyError')"
    test-id="order-detail-error"
    retry-test-id="order-detail-retry"
    @retry="loadOrder"
  />
  <MemberEmptyState
    v-else-if="!order"
    :message="$t('orders.empty')"
    test-id="order-detail-empty"
    :cta-label="$t('orders.back')"
    :cta-to="localePath('/app/orders')"
    cta-test-id="order-detail-back-list"
  />
  <div
    v-else
    class="space-y-6"
    data-testid="order-detail"
  >
    <div>
      <NuxtLink
        :to="localePath('/app/orders')"
        class="inline-flex items-center gap-1 text-sm font-medium text-primary"
        data-testid="order-detail-back"
      >
        {{ $t('orders.back') }}
      </NuxtLink>
      <div class="mt-3 flex flex-wrap items-center gap-2">
        <h1
          class="text-2xl font-semibold text-highlighted"
          data-testid="order-number"
        >
          {{ $t('orders.detailTitle', { number: order.number }) }}
        </h1>
        <OrdersStatusPill :order="order" />
        <span
          v-if="usingDemo"
          class="app-badge app-badge-demo"
          data-testid="orders-sample-badge"
        >
          {{ $t('orders.sampleData') }}
        </span>
      </div>
    </div>

    <section
      class="rounded-2xl border border-default bg-elevated p-5"
      data-testid="order-package-items"
    >
      <h2 class="text-sm font-semibold text-muted">
        {{ $t('orders.sectionItems') }}
      </h2>
      <ul
        v-if="orderItems.length"
        class="mt-3 space-y-3"
      >
        <li
          v-for="item in orderItems"
          :key="item.code"
          class="flex items-start justify-between gap-3"
          :data-testid="`order-item-${item.code}`"
        >
          <span class="min-w-0 font-medium text-highlighted">
            {{ item.name }}
          </span>
          <span
            v-if="item.monthlyCost != null"
            class="shrink-0 text-base font-semibold tabular-nums text-primary"
          >
            {{ formatTwd(item.monthlyCost) }}
          </span>
          <span
            v-else
            class="shrink-0 text-base font-semibold tabular-nums text-primary"
          >
            {{ formatTwd(order.amount) }}
          </span>
        </li>
      </ul>
      <div
        v-else
        class="mt-3 flex items-start justify-between gap-3"
      >
        <span class="font-medium text-highlighted">
          {{ orderProductSummary(order) || $t('orders.itemsEmpty') }}
        </span>
        <span class="shrink-0 text-base font-semibold tabular-nums text-primary">
          {{ formatTwd(order.amount) }}
        </span>
      </div>
    </section>

    <section
      class="rounded-2xl border border-default bg-elevated p-5"
      data-testid="order-payment-section"
    >
      <h2 class="text-sm font-semibold text-muted">
        {{ $t('orders.sectionPayment') }}
      </h2>
      <div class="mt-3 flex flex-wrap items-start justify-between gap-3">
        <p
          class="text-highlighted"
          data-testid="order-payment-status"
        >
          {{ paymentProviderLabel }} / {{ paymentLabel(order) }}
        </p>
        <p class="text-base font-semibold tabular-nums text-highlighted">
          {{ formatTwd(order.amount) }}
        </p>
      </div>

      <div
        v-if="showRepay || showCancel"
        class="mt-5 flex flex-wrap gap-3"
      >
        <AppButton
          v-if="showRepay"
          data-testid="order-repay"
          :disabled="actionPending"
          @click="onRepay"
        >
          {{ $t('orders.repay') }}
        </AppButton>
        <AppButton
          v-if="showCancel && !cancelOpen"
          variant="outline"
          data-testid="order-cancel"
          :disabled="actionPending"
          @click="cancelOpen = true"
        >
          {{ $t('orders.cancel') }}
        </AppButton>
      </div>
      <div
        v-if="cancelOpen"
        class="mt-4 rounded-xl border border-default bg-default p-4"
        data-testid="order-cancel-panel"
      >
        <p class="text-sm font-medium text-highlighted">
          {{ $t('orders.cancelTitle') }}
        </p>
        <p class="mt-1 text-sm text-muted">
          {{ $t('orders.cancelHint') }}
        </p>
        <textarea
          v-model="cancelReason"
          class="mt-3 w-full rounded-lg border border-default bg-elevated px-3 py-2 text-sm"
          rows="2"
          :placeholder="$t('orders.cancelReasonPlaceholder')"
          data-testid="order-cancel-reason"
        />
        <div class="mt-3 flex flex-wrap gap-2">
          <AppButton
            data-testid="order-cancel-confirm"
            :disabled="actionPending"
            @click="onCancelConfirm"
          >
            {{ $t('orders.cancelConfirm') }}
          </AppButton>
          <AppButton
            variant="ghost"
            :disabled="actionPending"
            @click="cancelOpen = false; cancelReason = ''; actionError = ''"
          >
            {{ $t('orders.cancelDismiss') }}
          </AppButton>
        </div>
      </div>
      <p
        v-if="actionError"
        class="mt-3 text-sm text-red-600 dark:text-red-400"
        data-testid="order-action-error"
      >
        {{ actionError }}
      </p>
    </section>

    <section
      class="rounded-2xl border border-default bg-elevated p-5"
      data-testid="order-invoice-section"
    >
      <h2 class="text-sm font-semibold text-muted">
        {{ $t('orders.sectionInvoice') }}
      </h2>
      <p class="mt-3 text-highlighted">
        {{ invoiceSummary }}
      </p>
      <p
        v-if="order.invoiceNumber"
        class="mt-1 text-sm tabular-nums text-muted"
      >
        {{ $t('orders.invoiceNumber') }}：{{ order.invoiceNumber }}
      </p>
    </section>

    <section
      class="rounded-2xl border border-default bg-elevated p-5"
      data-testid="order-shipping-section"
    >
      <h2 class="text-sm font-semibold text-muted">
        {{ $t('orders.sectionShipping') }}
      </h2>
      <dl class="mt-3 space-y-2 text-sm">
        <div>
          <dt class="inline text-muted">
            {{ $t('orders.recipient') }}：
          </dt>
          <dd class="inline text-highlighted">
            {{ order.recipient.name || '—' }}
          </dd>
        </div>
        <div>
          <dt class="inline text-muted">
            {{ $t('orders.address') }}：
          </dt>
          <dd class="inline text-highlighted">
            {{ order.recipient.address || '—' }}
          </dd>
        </div>
        <div v-if="order.trackingNumber">
          <dt class="inline text-muted">
            {{ $t('orders.trackingNumber') }}：
          </dt>
          <dd class="inline">
            <a
              v-if="order.trackingUrl"
              :href="order.trackingUrl"
              class="inline-flex items-center gap-1 font-medium text-primary"
              target="_blank"
              rel="noopener noreferrer"
              data-testid="order-tracking-link"
            >
              <span class="tabular-nums">{{ order.trackingNumber }}</span>
              <UIcon
                name="i-lucide-external-link"
                class="size-3.5"
                aria-hidden="true"
              />
            </a>
            <span
              v-else
              class="tabular-nums text-highlighted"
              data-testid="order-tracking-number"
            >
              {{ order.trackingNumber }}
            </span>
          </dd>
        </div>
      </dl>
    </section>

    <AppButton
      variant="outline"
      data-testid="order-view-chat"
      @click="chatOpen = true"
    >
      {{ $t('orders.viewChat') }}
    </AppButton>

    <OrderChatModal
      :open="chatOpen"
      :order-id="order.id"
      :order-number="order.number"
      @close="chatOpen = false"
    />
  </div>
</template>

<script setup lang="ts">
import { formatTwd, type OrderItemLine, type OrderRecord } from '~/utils/first-order'
import { orderProductSummary } from '~/utils/order-display'
import { getDemoOrder, isDemoOrderId } from '~/utils/orders-mock'
import { canCancelOrder, canRepayOrder } from '~/utils/order-actions'

definePageMeta({
  layout: 'user',
  middleware: 'auth'
})

const route = useRoute()
const localePath = useLocalePath()
const nuxtApp = useNuxtApp()
const { t } = useI18n()
const auth = useAuthStore()
const api = useFirstOrderApi()
const order = ref<OrderRecord | null>(null)
const loading = ref(true)
const loadError = ref(false)
const usingDemo = ref(false)
const chatOpen = ref(false)
const cancelOpen = ref(false)
const cancelReason = ref('')
const actionPending = ref(false)
const actionError = ref('')
const gateLocked = ref(nuxtApp.isHydrating || !auth.isMember)

function syncGate() {
  gateLocked.value = !auth.isMember
}

const orderItems = computed<OrderItemLine[]>(() => {
  if (!order.value) {
    return []
  }
  if (order.value.items?.length) {
    return order.value.items
  }
  return order.value.productCodes.map((code, index) => ({
    code,
    name: order.value!.productNames?.[index] || code,
    dailyDose: 1
  }))
})

const showRepay = computed(() => order.value ? canRepayOrder(order.value) : false)
const showCancel = computed(() => order.value ? canCancelOrder(order.value) : false)

const paymentProviderLabel = computed(() => {
  if (!order.value) {
    return ''
  }
  const key = `orders.provider.${order.value.paymentMethod}`
  const label = t(key)
  return label === key ? t(`checkout.${order.value.paymentMethod}`) : label
})

const invoiceSummary = computed(() => {
  if (!order.value) {
    return ''
  }
  const typeLabel = t(`orders.invoiceType.${order.value.invoice}`)
  const carrier = order.value.invoiceCarrierLabel || t('orders.invoiceCarrierDefault')
  return `${typeLabel} / ${carrier}`
})

function paymentLabel(current: OrderRecord) {
  const status = current.paymentStatus || 'unpaid'
  const key = `orders.payment${status.charAt(0).toUpperCase()}${status.slice(1)}`
  return t(key)
}

async function onRepay() {
  if (!order.value || actionPending.value || usingDemo.value) {
    return
  }
  actionPending.value = true
  actionError.value = ''
  try {
    const created = await api.repayOrder(order.value.id, order.value.paymentMethod)
    const redirectUrl = created.payment?.redirect_url
    if (redirectUrl) {
      window.location.assign(redirectUrl)
      return
    }
    order.value = await api.getOrder(order.value.id)
  } catch {
    actionError.value = t('orders.repayError')
  } finally {
    actionPending.value = false
  }
}

async function onCancelConfirm() {
  if (!order.value || actionPending.value || usingDemo.value) {
    return
  }
  actionPending.value = true
  actionError.value = ''
  try {
    const reason = cancelReason.value.trim()
    order.value = await api.cancelOrder(order.value.id, {
      cancel_reason: reason || null
    })
    cancelOpen.value = false
    cancelReason.value = ''
  } catch {
    actionError.value = t('orders.cancelError')
  } finally {
    actionPending.value = false
  }
}

async function loadOrder() {
  if (!auth.isMember) {
    order.value = null
    loading.value = false
    loadError.value = false
    usingDemo.value = false
    return
  }

  const id = String(route.params.id)
  loading.value = true
  loadError.value = false
  try {
    if (isDemoOrderId(id)) {
      order.value = getDemoOrder(id)
      usingDemo.value = true
      return
    }
    order.value = await api.getOrder(id)
    usingDemo.value = false
  } catch {
    const demo = getDemoOrder(id)
    if (demo) {
      order.value = demo
      usingDemo.value = true
    } else {
      order.value = null
      loadError.value = true
      usingDemo.value = false
    }
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  syncGate()
  void loadOrder()
})

watch(() => auth.isMember, (member) => {
  syncGate()
  if (member) {
    void loadOrder()
  } else {
    order.value = null
    loadError.value = false
    loading.value = false
    usingDemo.value = false
  }
})

watch(() => route.params.id, () => {
  if (auth.isMember) {
    void loadOrder()
  }
})
</script>
