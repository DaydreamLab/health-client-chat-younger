<template>
  <span
    class="inline-flex rounded-full px-2.5 py-1 text-xs font-medium"
    :class="orderDisplayStatusClass(status)"
    data-testid="order-status"
    :data-status="status"
  >
    {{ $t(`orders.status.${status}`) }}
  </span>
</template>

<script setup lang="ts">
import {
  orderDisplayStatus,
  orderDisplayStatusClass,
  type OrderDisplayStatus
} from '~/utils/order-display'
import type { OrderRecord } from '~/utils/first-order'

const props = defineProps<{
  order: OrderRecord
}>()

const status = computed<OrderDisplayStatus>(() => orderDisplayStatus(props.order))
</script>
