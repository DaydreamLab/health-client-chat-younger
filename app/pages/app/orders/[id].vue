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

onMounted(async () => {
  const id = String(route.params.id)
  try {
    order.value = await api.getOrder(id)
  } catch {
    order.value = null
  }
})
</script>
