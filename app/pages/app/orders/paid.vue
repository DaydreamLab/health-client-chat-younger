<template>
  <div
    class="mx-auto max-w-md px-4 py-12 text-center sm:px-6"
    data-testid="expert-booking-paid-page"
  >
    <span class="mx-auto flex size-16 items-center justify-center rounded-full bg-primary/10 text-primary ring-1 ring-primary/20">
      <UIcon
        name="i-lucide-check"
        class="size-8"
      />
    </span>
    <h1 class="mt-6 text-2xl font-semibold text-primary">
      {{ $t('expertBooking.paidTitle') }}
    </h1>
    <p class="mt-3 text-sm leading-6 text-muted">
      {{ $t('expertBooking.paidBody') }}
    </p>

    <section
      v-if="order"
      class="mt-8 rounded-2xl border border-default bg-elevated p-5 text-start"
      data-testid="expert-booking-paid-summary"
    >
      <dl class="space-y-3 text-sm">
        <div class="flex justify-between gap-3">
          <dt class="text-muted">
            {{ $t('expertBooking.orderLabel') }}
          </dt>
          <dd class="font-mono text-highlighted">
            {{ order.number }}
          </dd>
        </div>
        <div class="flex justify-between gap-3">
          <dt class="text-muted">
            {{ $t('expertBooking.amount') }}
          </dt>
          <dd class="font-semibold tabular-nums text-highlighted">
            {{ formatTwd(order.amount) }}
          </dd>
        </div>
        <div class="flex items-center justify-between gap-3">
          <dt class="text-muted">
            {{ $t('expertBooking.serviceStatus') }}
          </dt>
          <dd>
            <ExpertBookingStatusPill
              :status="order.expertBooking?.status || 'awaiting_schedule'"
            />
          </dd>
        </div>
      </dl>
    </section>

    <AppButton
      class="mt-8 w-full"
      :to="orderDetailTo"
      data-testid="expert-booking-view-order"
    >
      {{ $t('expertBooking.viewOrder') }}
    </AppButton>
  </div>
</template>

<script setup lang="ts">
import type { OrderRecord } from '~/utils/first-order'
import { formatTwd } from '~/utils/first-order'

definePageMeta({
  layout: 'user',
  middleware: 'auth'
})

const route = useRoute()
const localePath = useLocalePath()
const api = useFirstOrderApi()
const auth = useAuthStore()

const order = ref<OrderRecord | null>(null)

const orderId = computed(() => {
  const raw = route.query.id
  return typeof raw === 'string' ? raw : ''
})

const orderDetailTo = computed(() =>
  orderId.value
    ? localePath(`/app/orders/${orderId.value}`)
    : localePath('/app/orders')
)

onMounted(async () => {
  await auth.ensureSession()
  if (!orderId.value || !auth.isMember) {
    return
  }
  try {
    order.value = await api.getOrder(orderId.value)
  } catch {
    order.value = null
  }
})
</script>
