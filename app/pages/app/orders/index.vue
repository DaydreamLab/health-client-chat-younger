<template>
  <div class="space-y-6">
    <div class="flex flex-wrap items-center gap-2">
      <h1 class="text-2xl font-semibold text-highlighted">
        {{ $t('orders.title') }}
      </h1>
      <span
        v-if="usingDemo"
        class="app-badge app-badge-demo"
        data-testid="orders-sample-badge"
      >
        {{ $t('orders.sampleData') }}
      </span>
    </div>
    <p class="text-sm text-muted">
      {{ $t('orders.subtitle') }}
    </p>
    <p
      v-if="usingDemo"
      class="text-sm leading-6 text-muted"
      data-testid="orders-demo-hint"
    >
      {{ $t('orders.demoHint') }}
    </p>

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
      <ul
        v-else
        class="space-y-3"
        data-testid="orders-list"
      >
        <li
          v-for="order in list"
          :key="order.id"
        >
          <NuxtLink
            :to="localePath(`/app/orders/${order.id}`)"
            class="flex items-center gap-3 rounded-2xl border border-default bg-elevated p-4 transition-colors hover:border-primary/40 sm:p-5"
            :data-testid="`order-card-${order.id}`"
          >
            <div class="min-w-0 flex-1 space-y-1.5">
              <p
                class="text-sm font-medium tabular-nums text-highlighted"
                data-testid="order-card-number"
              >
                {{ order.number }}
              </p>
              <p
                class="text-xs tabular-nums text-muted"
                data-testid="order-card-date"
              >
                {{ formatOrderDate(order.createdAt) }}
              </p>
              <p
                class="pt-1 text-base font-semibold text-highlighted"
                data-testid="order-card-summary"
              >
                {{ orderProductSummary(order) }}
              </p>
              <p
                class="text-lg font-semibold tabular-nums text-highlighted"
                data-testid="order-card-amount"
              >
                {{ formatTwd(order.amount) }}
              </p>
              <div class="pt-1">
                <OrdersStatusPill :order="order" />
              </div>
            </div>
            <UIcon
              name="i-lucide-chevron-right"
              class="size-5 shrink-0 text-muted"
              aria-hidden="true"
            />
          </NuxtLink>
        </li>
      </ul>
    </template>
  </div>
</template>

<script setup lang="ts">
import { formatTwd, type OrderRecord } from '~/utils/first-order'
import { formatOrderDate, orderProductSummary } from '~/utils/order-display'
import {
  listDemoOrders,
  ORDERS_DEMO_QUERY,
  parseOrdersDemoMode
} from '~/utils/orders-mock'

definePageMeta({
  layout: 'user',
  middleware: 'auth'
})

const localePath = useLocalePath()
const route = useRoute()
const nuxtApp = useNuxtApp()
const auth = useAuthStore()
const api = useFirstOrderApi()
const list = ref<OrderRecord[]>([])
const loading = ref(true)
const loadError = ref(false)
const usingDemo = ref(false)

// SSR paints the guest gate; sync after hydration so members are not stuck behind it.
const gateLocked = ref(nuxtApp.isHydrating || !auth.isMember)

const demoMode = computed(() => {
  const raw = route.query[ORDERS_DEMO_QUERY]
  const value = Array.isArray(raw) ? raw[0] : raw
  return parseOrdersDemoMode(typeof value === 'string' ? value : undefined)
})

function syncGate() {
  gateLocked.value = !auth.isMember
}

async function loadOrders() {
  if (!auth.isMember) {
    list.value = []
    loading.value = false
    loadError.value = false
    usingDemo.value = false
    return
  }

  loading.value = true
  loadError.value = false
  try {
    const fromApi = await api.listOrders()
    if (fromApi.length > 0) {
      list.value = fromApi
      usingDemo.value = false
      return
    }
    // 金流 E2E paused: show Irice sample cards when API is empty unless ?demo=empty
    if (demoMode.value === 'empty') {
      list.value = []
      usingDemo.value = false
      return
    }
    list.value = listDemoOrders()
    usingDemo.value = true
  } catch {
    loadError.value = true
    list.value = []
    usingDemo.value = false
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
    usingDemo.value = false
  }
})

watch(demoMode, () => {
  if (auth.isMember && !gateLocked.value) {
    void loadOrders()
  }
})
</script>
