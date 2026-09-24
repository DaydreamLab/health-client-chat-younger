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
            {{ $t('orders.package') }}
          </dt>
          <dd class="mt-1 text-highlighted">
            {{ order.packageName || order.packagePlanCode }}
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

    <section class="rounded-2xl border border-default bg-elevated p-5">
      <h2 class="font-semibold text-highlighted">
        {{ $t('orders.items') }}
      </h2>
      <ul class="mt-3 divide-y divide-default">
        <li
          v-for="(productCode, index) in order.productCodes"
          :key="productCode"
          class="flex items-center justify-between gap-3 py-3 text-sm"
        >
          <span class="text-highlighted">
            {{ order.productNames?.[index] || productCode }}
          </span>
        </li>
      </ul>
    </section>

    <AppButton
      :to="`${localePath('/chat')}?orderId=${order.id}`"
      data-testid="order-view-chat"
    >
      {{ $t('orders.viewChat') }}
    </AppButton>
  </div>
  <p
    v-else
    class="text-sm text-muted"
  >
    {{ $t('orders.empty') }}
  </p>
</template>

<script setup lang="ts">
import { formatTwd, type OrderRecord } from '~/utils/first-order'

definePageMeta({
  layout: 'user',
  middleware: 'auth'
})

const route = useRoute()
const localePath = useLocalePath()
const { t } = useI18n()
const api = useFirstOrderApi()
const order = ref<OrderRecord | null>(null)

function formatWhen(value: string) {
  return value.replace('T', ' ').slice(0, 16).replace(/-/g, '/')
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
