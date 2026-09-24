<template>
  <div class="space-y-6">
    <div>
      <h1 class="text-2xl font-semibold text-highlighted">
        {{ $t('orders.title') }}
      </h1>
      <p class="mt-1 text-sm text-muted">
        {{ $t('orders.subtitle') }}
      </p>
    </div>

    <p
      v-if="!list.length"
      class="rounded-2xl border border-dashed border-default bg-elevated p-8 text-sm text-muted"
      data-testid="orders-empty"
    >
      {{ $t('orders.empty') }}
    </p>

    <article
      v-for="order in list"
      :key="order.id"
      class="rounded-2xl border border-default bg-elevated p-5"
      :data-testid="`order-card-${order.id}`"
    >
      <div class="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p class="text-xs text-muted">
            {{ $t('orders.number') }}
          </p>
          <p class="font-medium tabular-nums text-highlighted">
            {{ order.number }}
          </p>
        </div>
        <div>
          <p class="text-xs text-muted">
            {{ $t('orders.date') }}
          </p>
          <p class="text-sm tabular-nums text-highlighted">
            {{ formatWhen(order.createdAt) }}
          </p>
        </div>
        <div>
          <p class="text-xs text-muted">
            {{ $t('orders.package') }}
          </p>
          <p class="text-sm text-highlighted">
            {{ order.packageName || order.packagePlanCode }}
          </p>
        </div>
        <div class="text-end">
          <p class="text-xs text-muted">
            {{ $t('orders.amount') }}
          </p>
          <p class="text-lg font-semibold tabular-nums text-primary">
            {{ formatTwd(order.amount) }}
          </p>
        </div>
      </div>

      <p
        class="mt-3 inline-flex rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary"
        data-testid="order-status"
      >
        {{ $t(`orders.${statusOf(order)}`) }}
      </p>

      <div class="mt-4">
        <p class="text-xs text-muted">
          {{ $t('orders.items') }}
        </p>
        <ul
          class="mt-1 space-y-1 text-sm text-highlighted"
          data-testid="order-items"
        >
          <li
            v-for="(productCode, index) in order.productCodes"
            :key="productCode"
            :data-testid="`order-item-${productCode}`"
          >
            {{ order.productNames?.[index] || productCode }}
          </li>
        </ul>
      </div>

      <div class="mt-5">
        <p class="mb-3 text-sm font-medium text-highlighted">
          {{ $t('orders.timeline') }}
        </p>
        <ShipmentTimeline :timeline="order.timeline" />
      </div>

      <div class="mt-5 flex flex-wrap gap-2">
        <AppButton
          :to="localePath(`/app/orders/${order.id}`)"
          variant="outline"
        >
          {{ $t('orders.viewDetail') }}
        </AppButton>
        <AppButton
          :to="`${localePath('/chat')}?orderId=${order.id}`"
          variant="ghost"
          :data-testid="`order-chat-${order.id}`"
        >
          {{ $t('orders.viewChat') }}
        </AppButton>
      </div>
    </article>
  </div>
</template>

<script setup lang="ts">
import { formatTwd, timelineStatus, type OrderRecord } from '~/utils/first-order'

definePageMeta({
  layout: 'user',
  middleware: 'auth'
})

const localePath = useLocalePath()
const api = useFirstOrderApi()
const list = ref<OrderRecord[]>([])

function formatWhen(value: string) {
  return value.replace('T', ' ').slice(0, 16).replace(/-/g, '/')
}

function statusOf(order: OrderRecord) {
  return timelineStatus(order.timeline)
}

onMounted(async () => {
  list.value = await api.listOrders()
})
</script>
