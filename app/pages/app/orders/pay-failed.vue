<template>
  <div
    class="mx-auto max-w-md px-4 py-12 text-center sm:px-6"
    data-testid="expert-booking-pay-failed-page"
  >
    <span class="mx-auto flex size-16 items-center justify-center rounded-full bg-error/10 text-error ring-1 ring-error/20">
      <UIcon
        name="i-lucide-alert-circle"
        class="size-8"
      />
    </span>
    <h1 class="mt-6 text-2xl font-semibold text-highlighted">
      {{ $t('expertBooking.payFailedTitle') }}
    </h1>
    <p class="mt-3 text-sm leading-6 text-muted">
      {{ $t('expertBooking.payFailedBody') }}
    </p>

    <AppButton
      class="mt-8 w-full"
      variant="outline"
      :disabled="!orderId || repayPending"
      data-testid="expert-booking-repay"
      @click="onRepay"
    >
      {{ repayPending ? $t('expertBooking.submitting') : $t('expertBooking.repay') }}
    </AppButton>

    <AppButton
      class="mt-3 w-full"
      variant="ghost"
      :to="localePath('/app/orders')"
      data-testid="expert-booking-pay-later"
    >
      {{ $t('expertBooking.payLater') }}
    </AppButton>

    <p
      v-if="repayError"
      class="mt-4 text-sm text-error"
    >
      {{ repayError }}
    </p>
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  layout: 'user',
  middleware: 'auth'
})

const route = useRoute()
const localePath = useLocalePath()
const { t } = useI18n()
const api = useFirstOrderApi()
const auth = useAuthStore()

const repayPending = ref(false)
const repayError = ref('')

const orderId = computed(() => {
  const raw = route.query.id
  return typeof raw === 'string' ? raw : ''
})

async function onRepay() {
  if (!orderId.value || repayPending.value) {
    return
  }
  repayPending.value = true
  repayError.value = ''
  try {
    const created = await api.repayOrder(orderId.value, 'card')
    const redirectUrl = created.payment?.redirect_url
    if (redirectUrl) {
      window.location.assign(redirectUrl)
      return
    }
    if (created.payment_status === 'paid') {
      await navigateTo({
        path: localePath('/app/orders/paid'),
        query: { id: orderId.value }
      })
      return
    }
    repayError.value = t('expertBooking.repayError')
  } catch {
    repayError.value = t('expertBooking.repayError')
  } finally {
    repayPending.value = false
  }
}

onMounted(async () => {
  await auth.ensureSession()
})
</script>
