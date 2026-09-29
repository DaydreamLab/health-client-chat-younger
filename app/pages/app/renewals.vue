<template>
  <div class="space-y-6">
    <div>
      <h1 class="text-2xl font-semibold text-highlighted">
        {{ $t('renewals.title') }}
      </h1>
      <p class="mt-1 text-sm text-muted">
        {{ $t('renewals.subtitle') }}
      </p>
    </div>

    <p
      v-if="loadError"
      class="text-sm text-red-600 dark:text-red-400"
      data-testid="renewals-error"
    >
      {{ loadError }}
    </p>
    <p
      v-else-if="loading"
      class="text-sm text-muted"
      data-testid="renewals-loading"
    >
      {{ $t('renewals.loading') }}
    </p>
    <p
      v-else-if="!renewals.length"
      class="rounded-2xl border border-dashed border-default bg-elevated px-5 py-8 text-center text-sm text-muted"
      data-testid="renewals-empty"
    >
      {{ $t('renewals.empty') }}
    </p>
    <ul
      v-else
      class="space-y-3"
      data-testid="renewals-list"
    >
      <li
        v-for="item in renewals"
        :key="item.order_id"
        class="flex flex-wrap items-center gap-3 rounded-2xl border border-default bg-elevated p-5"
        :data-testid="`renewal-${item.order_id}`"
      >
        <div class="min-w-0 flex-1">
          <p class="text-xs text-muted">
            {{ item.order_no }}
          </p>
          <p class="mt-1 font-semibold text-highlighted">
            {{ item.package_name || item.package_code }}
          </p>
          <p class="mt-1 text-sm text-muted">
            <span v-if="item.expired">
              {{ $t('renewals.expired', { days: Math.abs(item.days_left) }) }}
            </span>
            <span v-else>
              {{ $t('renewals.daysLeft', { days: item.days_left }) }}
            </span>
            <span class="tabular-nums"> · {{ formatWhen(item.period_end) }}</span>
          </p>
        </div>
        <AppButton
          :disabled="startingId === item.order_id"
          :data-testid="`renewal-start-${item.order_id}`"
          @click="startRenewal(item.order_id)"
        >
          {{ $t('renewals.startChat') }}
        </AppButton>
      </li>
    </ul>
    <p
      v-if="startError"
      class="text-sm text-red-600 dark:text-red-400"
      data-testid="renewals-start-error"
    >
      {{ startError }}
    </p>
  </div>
</template>

<script setup lang="ts">
import type { RenewalDueItem } from '~/utils/candor-api'

definePageMeta({
  layout: 'user',
  middleware: 'auth'
})

const localePath = useLocalePath()
const { t } = useI18n()
const candor = useCandorApi()
const journey = useJourneyStore()
const auth = useAuthStore()

const renewals = ref<RenewalDueItem[]>([])
const loading = ref(true)
const loadError = ref('')
const startingId = ref<string | null>(null)
const startError = ref('')

function formatWhen(value: string) {
  return value.replace('T', ' ').slice(0, 16).replace(/-/g, '/')
}

async function startRenewal(orderId: string) {
  if (startingId.value) {
    return
  }
  startingId.value = orderId
  startError.value = ''
  try {
    await auth.ensureSession()
    journey.clearSession()
    const created = await candor.createConversation({ renewal_of_order_id: orderId })
    journey.conversationId = created.id
    journey.goalSelectActive = false
    journey.goalOptions = []
    journey.selectedCodes = []
    journey.messages = [{
      id: created.greeting.message_id || 'greet',
      role: 'assistant',
      parts: [{ type: 'text', text: created.greeting.content }],
      options: created.greeting.options ?? []
    }]
    await navigateTo(localePath('/chat'))
  } catch {
    startError.value = t('renewals.startError')
  } finally {
    startingId.value = null
  }
}

onMounted(async () => {
  loading.value = true
  loadError.value = ''
  try {
    await auth.ensureSession()
    const payload = await candor.listRenewalsDue()
    renewals.value = payload.renewals ?? []
  } catch {
    loadError.value = t('renewals.loadError')
  } finally {
    loading.value = false
  }
})
</script>
