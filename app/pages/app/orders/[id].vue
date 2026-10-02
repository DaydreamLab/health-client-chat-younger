<template>
  <div
    v-if="order"
    class="space-y-6"
  >
    <AppButton
      :to="localePath('/app/orders')"
      variant="ghost"
      class="px-0"
    >
      ← {{ $t('orders.back') }}
    </AppButton>

    <section class="rounded-2xl border border-default bg-elevated p-5">
      <div class="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p class="text-xs text-muted">
            {{ $t('orders.number') }}
          </p>
          <h1
            class="text-2xl font-semibold tabular-nums text-highlighted"
            data-testid="order-number"
          >
            {{ order.number }}
          </h1>
        </div>
        <p class="text-2xl font-semibold tabular-nums text-primary">
          {{ formatTwd(order.amount) }}
        </p>
      </div>
      <dl class="mt-4 grid gap-3 text-sm sm:grid-cols-2">
        <div>
          <dt class="text-muted">
            {{ $t('orders.date') }}
          </dt>
          <dd class="mt-1 tabular-nums text-highlighted">
            {{ formatWhen(order.createdAt) }}
          </dd>
        </div>
        <div>
          <dt class="text-muted">
            {{ $t('orders.paymentStatus') }}
          </dt>
          <dd
            class="mt-1 text-highlighted"
            data-testid="order-payment-status"
          >
            {{ paymentLabel(order) }}
          </dd>
        </div>
        <div>
          <dt class="text-muted">
            {{ $t('orders.payment') }}
          </dt>
          <dd class="mt-1 text-highlighted">
            {{ $t(`checkout.${order.paymentMethod}`) }}
          </dd>
        </div>
        <div>
          <dt class="text-muted">
            {{ $t('checkout.delivery') }}
          </dt>
          <dd class="mt-1 text-highlighted">
            {{ $t('checkout.deliveryHome') }}
          </dd>
        </div>
        <div>
          <dt class="text-muted">
            {{ $t('orders.recipient') }}
          </dt>
          <dd class="mt-1 text-highlighted">
            {{ order.recipient.name }} · {{ order.recipient.phone }}
          </dd>
        </div>
        <div>
          <dt class="text-muted">
            {{ $t('orders.address') }}
          </dt>
          <dd class="mt-1 text-highlighted">
            {{ order.recipient.address }}
          </dd>
        </div>
      </dl>

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

    <section class="rounded-2xl border border-default bg-elevated p-5">
      <h2 class="font-semibold text-highlighted">
        {{ $t('orders.timeline') }}
      </h2>
      <div class="mt-4">
        <ShipmentTimeline :timeline="order.timeline" />
      </div>
    </section>

    <section
      class="overflow-hidden rounded-2xl border border-default bg-elevated"
      data-testid="order-package-items"
    >
      <div class="border-b border-default px-5 py-4">
        <h2 class="font-semibold text-highlighted">
          {{ $t('orders.packageItems') }}
        </h2>
        <p
          v-if="order.packageName || order.packagePlanCode"
          class="mt-1 text-sm text-muted"
        >
          {{ order.packageName || order.packagePlanCode }}
          <span class="tabular-nums text-highlighted"> · {{ formatTwd(order.amount) }}</span>
        </p>
      </div>
      <ul
        v-if="orderItems.length"
        class="divide-y divide-default"
      >
        <li
          v-for="item in orderItems"
          :key="item.code"
          class="flex items-start gap-3 px-5 py-4"
          :data-testid="`order-item-${item.code}`"
        >
          <span class="mt-0.5 size-10 shrink-0 overflow-hidden rounded-xl bg-primary/10 text-primary">
            <img
              v-if="item.imageUrl"
              :src="item.imageUrl"
              :alt="item.name || ''"
              class="size-full object-cover"
              loading="lazy"
              data-testid="order-item-image"
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
                :class="item.isCore ? 'app-badge-demo' : 'app-badge-pending'"
                :data-testid="`order-item-kind-${item.code}`"
              >
                {{ item.isCore ? $t('recommendation.itemKindCore') : $t('recommendation.itemKindFunctional') }}
              </span>
            </span>
          </span>
          <span class="flex shrink-0 flex-col items-end gap-1">
            <span
              class="app-badge app-badge-pending"
              :data-testid="`order-item-dose-${item.code}`"
            >
              {{ doseLabel(item.dailyDose) }}
            </span>
            <span
              v-if="item.monthlyCost != null"
              class="text-sm tabular-nums text-muted"
            >
              {{ formatTwd(item.monthlyCost) }}
            </span>
          </span>
        </li>
      </ul>
      <p
        v-else
        class="px-5 py-6 text-sm text-muted"
      >
        {{ $t('orders.itemsEmpty') }}
      </p>
    </section>

    <AppButton
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
  <p
    v-else
    class="text-sm text-muted"
  >
    {{ $t('orders.empty') }}
  </p>
</template>

<script setup lang="ts">
import { formatTwd, type OrderItemLine, type OrderRecord } from '~/utils/first-order'
import { canCancelOrder, canRepayOrder } from '~/utils/order-actions'

definePageMeta({
  layout: 'user',
  middleware: 'auth'
})

const route = useRoute()
const localePath = useLocalePath()
const { t } = useI18n()
const api = useFirstOrderApi()
const order = ref<OrderRecord | null>(null)
const chatOpen = ref(false)
const cancelOpen = ref(false)
const cancelReason = ref('')
const actionPending = ref(false)
const actionError = ref('')

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

function formatWhen(value: string) {
  return value.replace('T', ' ').slice(0, 16).replace(/-/g, '/')
}

function formatDoseCount(value: number): string {
  if (Number.isInteger(value)) {
    return String(value)
  }
  return String(value)
}

function doseLabel(count: number) {
  return t('orders.doseLocked', { count: formatDoseCount(count) })
}

function paymentLabel(current: OrderRecord) {
  const status = current.paymentStatus || 'unpaid'
  const key = `orders.payment${status.charAt(0).toUpperCase()}${status.slice(1)}`
  return t(key)
}

async function onRepay() {
  if (!order.value || actionPending.value) {
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
  if (!order.value || actionPending.value) {
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

onMounted(async () => {
  const id = String(route.params.id)
  try {
    order.value = await api.getOrder(id)
  } catch {
    order.value = null
  }
})
</script>
