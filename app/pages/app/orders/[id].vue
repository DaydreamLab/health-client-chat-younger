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

    <div
      v-if="expertProcessingBanner"
      class="rounded-2xl border border-primary/30 bg-primary/5 p-5"
      data-testid="order-expert-processing-banner"
    >
      <p class="font-semibold text-highlighted">
        {{ $t('orders.expert_processing.title') }}
      </p>
      <p class="mt-1 text-sm text-muted">
        {{ $t('orders.expert_processing.body') }}
      </p>
    </div>

    <ExpertBookingOrderSection
      v-if="order.expertBooking || order.hasExpertBookingLine"
      :booking="order.expertBooking || fallbackExpertBooking"
      :amount="order.amount"
    />

    <div
      v-if="refundRejectedBanner"
      class="rounded-2xl border border-amber-500/40 bg-amber-500/10 p-5"
      data-testid="order-refund-rejected-banner"
    >
      <p class="font-semibold text-highlighted">
        {{ $t('orders.refundRejectedTitle') }}
      </p>
      <p class="mt-2 text-sm text-highlighted">
        {{ $t('orders.refundRejectedReasonLabel') }}{{ order.refundRejectionReason || order.refundRejectReason || '—' }}
      </p>
      <p class="mt-2 text-sm text-muted">
        {{ $t('orders.refundRejectedNoRetry') }}
      </p>
    </div>

    <section
      v-if="!order.hasExpertBookingLine && !order.expertBooking"
      class="rounded-2xl border border-default bg-elevated p-5"
      data-testid="order-package-items"
    >
      <h2 class="text-sm font-semibold text-muted">
        {{ $t('orders.sectionItems') }}
      </h2>
      <div
        v-if="planDisplayName"
        class="mt-3"
        data-testid="order-plan-header"
      >
        <span
          class="app-badge"
          :class="order.hasExpertPlanLine ? 'app-badge-demo' : 'app-badge-pending'"
          data-testid="order-plan-label"
        >
          {{ order.hasExpertPlanLine ? $t('orders.planLabelExpert') : $t('orders.planLabelAi') }}
        </span>
        <div class="mt-2 flex items-start justify-between gap-3">
          <p
            class="min-w-0 flex-1 break-words text-base font-semibold text-highlighted"
            data-testid="order-plan-name"
          >
            {{ planDisplayName }}
          </p>
          <p
            class="shrink-0 text-base font-semibold tabular-nums text-primary"
            data-testid="order-plan-price"
          >
            {{ formatTwd(order.amount) }}
          </p>
        </div>
      </div>
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
          <template v-if="!planDisplayName">
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
          </template>
        </li>
      </ul>
      <div
        v-else-if="!planDisplayName"
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
        <div class="min-w-0">
          <p
            class="text-highlighted"
            data-testid="order-payment-status"
          >
            {{ paymentProviderLabel }} / {{ paymentStatusLabel }}
          </p>
          <p
            v-if="refundExtraLine"
            class="mt-1 text-sm font-medium text-highlighted"
            data-testid="order-refund-status-line"
          >
            {{ refundExtraLine }}
          </p>
        </div>
        <p class="text-base font-semibold tabular-nums text-highlighted">
          {{ formatTwd(order.amount) }}
        </p>
      </div>

      <div
        v-if="showRepay || showCancel || refundUi.showButton || showViewFinalPlan"
        class="mt-5 flex flex-col gap-2"
      >
        <div class="flex flex-wrap items-center gap-3">
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
          <AppButton
            v-if="refundUi.showButton"
            variant="outline"
            data-testid="order-refund-request"
            :disabled="actionPending || usingDemo || !refundUi.enabled"
            @click="refundConfirmOpen = true"
          >
            {{ $t('orders.refundRequest') }}
          </AppButton>
          <AppButton
            v-if="showViewFinalPlan"
            variant="outline"
            data-testid="order-view-final-plan"
            @click="onViewFinalPlan"
          >
            {{ $t('orders.viewFinalPlan') }}
          </AppButton>
        </div>
        <p
          v-if="refundBlockHint"
          class="text-sm text-muted"
          data-testid="order-refund-block-hint"
        >
          {{ refundBlockHint }}
        </p>
        <p
          v-if="refundActionError"
          class="text-sm text-red-600 dark:text-red-400"
          data-testid="order-refund-action-error"
        >
          {{ refundActionError }}
        </p>
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

    <Teleport to="body">
      <div
        v-if="refundConfirmOpen"
        class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
        data-testid="order-refund-confirm-modal"
        role="dialog"
        aria-modal="true"
      >
        <article class="w-full max-w-sm rounded-2xl border border-default bg-elevated p-5 shadow-xl">
          <h2 class="text-lg font-semibold text-highlighted">
            {{ $t('orders.refundConfirmTitle') }}
          </h2>
          <p class="mt-2 text-sm text-muted">
            {{ $t('orders.refundConfirmBody') }}
          </p>
          <div class="mt-6 flex flex-wrap gap-2">
            <AppButton
              variant="ghost"
              data-testid="order-refund-confirm-dismiss"
              :disabled="actionPending"
              @click="refundConfirmOpen = false"
            >
              {{ $t('orders.refundConfirmDismiss') }}
            </AppButton>
            <AppButton
              data-testid="order-refund-confirm-submit"
              :disabled="actionPending"
              @click="onRefundConfirm"
            >
              {{ $t('orders.refundConfirmSubmit') }}
            </AppButton>
          </div>
        </article>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import {
  formatTwd,
  normalizePlanDisplayName,
  type OrderItemLine,
  type OrderRecord
} from '~/utils/first-order'
import { orderProductSummary } from '~/utils/order-display'
import { getDemoOrder, isDemoOrderId } from '~/utils/orders-mock'
import { canCancelOrder, canRepayOrder } from '~/utils/order-actions'
import {
  isExpertProcessing,
  refundRequestDisplayText,
  refundRequestUi
} from '~/utils/expert-plan-order'
import type { ExpertBookingOnOrder } from '~/utils/expert-booking'

definePageMeta({
  layout: 'user',
  middleware: 'auth'
})

const route = useRoute()
const localePath = useLocalePath()
const nuxtApp = useNuxtApp()
const { t } = useI18n()
const auth = useAuthStore()
const journey = useJourneyStore()
const api = useFirstOrderApi()
const candor = useCandorApi()
const order = ref<OrderRecord | null>(null)
const loading = ref(true)
const loadError = ref(false)
const usingDemo = ref(false)
const chatOpen = ref(false)
const cancelOpen = ref(false)
const cancelReason = ref('')
const actionPending = ref(false)
const actionError = ref('')
const refundActionError = ref('')
const refundConfirmOpen = ref(false)
const gateLocked = ref(nuxtApp.isHydrating || !auth.isMember)

function syncGate() {
  gateLocked.value = !auth.isMember
}

const planDisplayName = computed(() =>
  normalizePlanDisplayName(order.value?.packageName) ?? ''
)

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

const refundUi = computed(() => {
  if (!order.value || usingDemo.value) {
    return {
      applicable: false,
      showButton: false,
      enabled: false,
      blockReason: null
    }
  }
  return refundRequestUi({
    refundBlockedReason: order.value.refundBlockedReason,
    refundStatus: order.value.refundStatus ?? order.value.refundRequestStatus,
    refundRequestStatus: order.value.refundRequestStatus,
    paymentStatus: order.value.paymentStatus,
    hasExpertPlanLine: order.value.hasExpertPlanLine
  })
})

const expertProcessingBanner = computed(() => {
  if (!order.value) {
    return false
  }
  return isExpertProcessing({
    hasExpertPlanLine: order.value.hasExpertPlanLine,
    paymentStatus: order.value.paymentStatus,
    expertCasePhase: order.value.expertCasePhase,
    expertCaseStatus: order.value.expertCaseStatus
  })
})

const refundRejectedBanner = computed(() =>
  Boolean(
    order.value?.hasExpertPlanLine
    && (order.value.refundStatus === 'rejected'
      || order.value.refundRequestStatus === 'rejected')
  )
)

const refundExtraLine = computed(() => {
  if (!order.value) {
    return null
  }
  if (order.value.refundRequestStatus === 'refunded'
    || order.value.refundStatus === 'refunded') {
    return t('orders.refundCompleted')
  }
  return refundRequestDisplayText({
    status: order.value.refundStatus ?? order.value.refundRequestStatus,
    display: order.value.refundRequestDisplay
  })
})

const showViewFinalPlan = computed(() =>
  Boolean(
    order.value?.hasExpertPlanLine
    && order.value.expertCasePhase === 'finalized'
    && order.value.conversationId?.trim()
  )
)

/** C7：訂單頁預約專家區塊缺 payload 時的安全預設（待安排、無選品）。 */
const fallbackExpertBooking = computed<ExpertBookingOnOrder>(() => ({
  id: order.value?.id ?? 'pending',
  status: 'awaiting_schedule',
  preferred_slots: [],
  attachments: [],
  product_picks: [],
  confirmed_starts_at: null,
  confirmed_ends_at: null
}))

const refundBlockHint = computed(() => {
  const reason = refundUi.value.blockReason
  if (!reason) {
    return ''
  }
  const key = `orders.refund_blocked.${reason}`
  const label = t(key)
  if (label !== key) {
    return label
  }
  if (reason === 'not_yet_reviewed') {
    return t('orders.refundBlockBeforeReviewed')
  }
  if (reason === 'picking_started') {
    return t('orders.refundBlockPicking')
  }
  if (reason === 'already_shipped') {
    return t('orders.refundBlockShipped')
  }
  return t('orders.refundBlockGeneric')
})

const paymentStatusLabel = computed(() => {
  if (!order.value) {
    return ''
  }
  const status = order.value.paymentStatus || 'unpaid'
  if (
    (order.value.refundRequestStatus === 'requested'
      || order.value.refundStatus === 'requested')
    && (status === 'paid' || status === 'refunded')
  ) {
    return t('orders.paymentPaid')
  }
  return paymentLabel(order.value)
})

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

async function onRefundConfirm() {
  if (!order.value || actionPending.value || usingDemo.value || !refundUi.value.enabled) {
    return
  }
  actionPending.value = true
  refundActionError.value = ''
  try {
    const created = await candor.createRefundRequest(order.value.id)
    const status = created.refund_status
      ?? created.refund_request_status
      ?? created.status
    order.value = {
      ...order.value,
      refundRequestStatus: status,
      refundStatus: status,
      refundRequestDisplay: created.refund_request_display
        ?? (status === 'requested' ? '退款申請中' : null),
      refundBlockedReason: 'refund_request_exists'
    }
    refundConfirmOpen.value = false
  } catch {
    refundActionError.value = t('orders.refundRequestError')
  } finally {
    actionPending.value = false
  }
}

function onViewFinalPlan() {
  if (!order.value) {
    return
  }
  const conversationId = order.value.conversationId?.trim()
  if (!conversationId) {
    return
  }
  journey.focusExpertReviewCase({
    conversationId,
    expertReviewStatus: 'reviewed'
  })
  void navigateTo(localePath(`/app/expert-cases/${conversationId}`))
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
