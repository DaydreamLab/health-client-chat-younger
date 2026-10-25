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

    <MemberAuthGate
      v-if="gateLocked"
      :title="$t('orders.guestRequired')"
      :hint="$t('orders.guestRequiredHint')"
      icon="i-lucide-package"
      test-id="orders-auth-gate"
      login-test-id="orders-login"
      register-test-id="orders-register"
      back-to-chat-test-id="orders-back-chat"
    />

    <template v-else>
      <MemberLoadingState
        v-if="loading"
        :message="$t('orders.loading')"
        test-id="orders-loading"
        skeleton
      />
      <MemberErrorState
        v-else-if="loadError"
        :message="$t('orders.emptyError')"
        test-id="orders-error"
        retry-test-id="orders-retry"
        @retry="loadOrders"
      />
      <MemberEmptyState
        v-else-if="!list.length"
        :message="$t('orders.empty')"
        test-id="orders-empty"
        :cta-label="$t('orders.emptyCta')"
        :cta-to="localePath('/chat')"
        cta-test-id="orders-empty-chat"
        cta-variant="outline"
      />
      <template v-else>
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

          <div class="mt-3 flex flex-wrap gap-2">
            <p
              class="inline-flex rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary"
              data-testid="order-status"
            >
              {{ $t(`orders.${statusOf(order)}`) }}
            </p>
            <p
              class="inline-flex rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-highlighted"
              data-testid="order-payment-status"
            >
              {{ paymentLabel(order) }}
            </p>
          </div>

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
              variant="ghost"
              :data-testid="`order-chat-${order.id}`"
              @click="openChat(order)"
            >
              {{ $t('orders.viewChat') }}
            </AppButton>
          </div>
        </article>
      </template>

      <OrderChatModal
        :open="chatOpen"
        :order-id="chatOrderId"
        :order-number="chatOrderNumber"
        @close="closeChat"
      />
    </template>
  </div>
</template>

<script setup lang="ts">
import { formatTwd, timelineStatus, type OrderRecord } from '~/utils/first-order'

definePageMeta({
  layout: 'user',
  middleware: 'auth'
})

const { t } = useI18n()
const localePath = useLocalePath()
const nuxtApp = useNuxtApp()
const auth = useAuthStore()
const api = useFirstOrderApi()
const list = ref<OrderRecord[]>([])
const loading = ref(true)
const loadError = ref(false)
const chatOpen = ref(false)
const chatOrderId = ref<string | null>(null)
const chatOrderNumber = ref<string | null>(null)

// SSR paints the guest gate; sync after hydration so members are not stuck behind it.
const gateLocked = ref(nuxtApp.isHydrating || !auth.isMember)

function syncGate() {
  gateLocked.value = !auth.isMember
}

function openChat(order: OrderRecord) {
  chatOrderId.value = order.id
  chatOrderNumber.value = order.number
  chatOpen.value = true
}

function closeChat() {
  chatOpen.value = false
}

function formatWhen(value: string) {
  return value.replace('T', ' ').slice(0, 16).replace(/-/g, '/')
}

function statusOf(order: OrderRecord) {
  if (order.paymentStatus && order.paymentStatus !== 'paid') {
    return 'awaitingPayment'
  }
  return timelineStatus(order.timeline)
}

function paymentLabel(order: OrderRecord) {
  const status = order.paymentStatus || 'unpaid'
  const key = `orders.payment${status.charAt(0).toUpperCase()}${status.slice(1)}`
  return t(key)
}

async function loadOrders() {
  if (!auth.isMember) {
    list.value = []
    loading.value = false
    loadError.value = false
    return
  }

  loading.value = true
  loadError.value = false
  try {
    list.value = await api.listOrders()
  } catch {
    loadError.value = true
    list.value = []
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  syncGate()
  void loadOrders()
})

watch(() => auth.isMember, (member) => {
  syncGate()
  if (member) {
    void loadOrders()
  } else {
    list.value = []
    loadError.value = false
    loading.value = false
  }
})
</script>
