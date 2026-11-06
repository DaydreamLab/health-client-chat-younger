<template>
  <div
    class="mx-auto max-w-lg px-4 py-8 sm:px-6"
    data-testid="expert-booking-confirm-page"
  >
    <NuxtLink
      :to="localePath('/expert-booking')"
      class="inline-flex items-center gap-1 text-sm font-medium text-primary"
      data-testid="expert-booking-confirm-edit"
    >
      <UIcon
        name="i-lucide-chevron-left"
        class="size-4"
      />
      {{ $t('expertBooking.edit') }}
    </NuxtLink>

    <div
      v-if="gateLocked"
      class="mt-10 text-center"
    >
      <p class="font-semibold text-highlighted">
        {{ $t('expertBooking.guestRequired') }}
      </p>
      <AppButton
        class="mt-4"
        :to="loginTo"
      >
        {{ $t('expertBooking.goLogin') }}
      </AppButton>
    </div>

    <div
      v-else-if="!hasDraft"
      class="mt-10 space-y-4 text-center"
      data-testid="expert-booking-confirm-empty"
    >
      <p class="text-muted">
        {{ $t('expertBooking.confirmEmpty') }}
      </p>
      <AppButton :to="localePath('/expert-booking')">
        {{ $t('expertBooking.backToForm') }}
      </AppButton>
    </div>

    <div
      v-else
      class="mt-6 space-y-6"
    >
      <h1 class="text-2xl font-semibold text-highlighted">
        {{ $t('expertBooking.confirmTitle') }}
      </h1>

      <div
        v-if="productState === 'unavailable' || submitUnavailable"
        class="rounded-2xl border border-amber-500/40 bg-amber-500/5 p-5"
        data-testid="expert-booking-unavailable"
      >
        <p class="font-semibold text-highlighted">
          {{ $t('expertBooking.unavailable') }}
        </p>
        <p class="mt-2 text-sm leading-6 text-muted">
          {{ $t('expertBooking.unavailableHint') }}
        </p>
      </div>

      <section
        v-else
        class="rounded-2xl border border-default bg-elevated p-5"
        data-testid="expert-booking-confirm-summary"
      >
        <dl class="space-y-3 text-sm">
          <div class="flex justify-between gap-3">
            <dt class="text-muted">
              {{ $t('expertBooking.item') }}
            </dt>
            <dd
              class="font-medium text-highlighted"
              data-testid="expert-booking-confirm-item"
            >
              {{ productName }}
            </dd>
          </div>
          <div class="flex justify-between gap-3">
            <dt class="text-muted">
              {{ $t('expertBooking.amount') }}
            </dt>
            <dd
              class="font-semibold tabular-nums text-primary"
              data-testid="expert-booking-confirm-amount"
            >
              <template v-if="productPrice != null">
                {{ formatTwd(productPrice) }}
              </template>
              <template v-else>
                {{ $t('expertBooking.amountPending') }}
              </template>
            </dd>
          </div>
          <div class="flex justify-between gap-3">
            <dt class="text-muted">
              {{ $t('expertBooking.contactName') }}
            </dt>
            <dd class="text-highlighted">
              {{ draft.contactName }}
            </dd>
          </div>
          <div class="flex justify-between gap-3">
            <dt class="text-muted">
              {{ $t('expertBooking.phone') }}
            </dt>
            <dd class="text-highlighted">
              {{ draft.phone }}
            </dd>
          </div>
          <div class="flex justify-between gap-3">
            <dt class="text-muted">
              {{ $t('expertBooking.email') }}
            </dt>
            <dd class="text-highlighted">
              {{ draft.email }}
            </dd>
          </div>
          <div class="flex justify-between gap-3">
            <dt class="text-muted">
              {{ $t('expertBooking.lineId') }}
            </dt>
            <dd
              class="text-highlighted"
              data-testid="expert-booking-confirm-line"
            >
              {{ draft.lineId || $t('expertBooking.notFilled') }}
            </dd>
          </div>
          <div class="flex justify-between gap-3">
            <dt class="shrink-0 text-muted">
              {{ $t('expertBooking.preferredSlots') }}
            </dt>
            <dd class="space-y-1 text-end text-highlighted">
              <p
                v-for="(slot, index) in slotLabels"
                :key="index"
              >
                {{ slot }}
              </p>
            </dd>
          </div>
          <div class="flex justify-between gap-3">
            <dt class="shrink-0 text-muted">
              {{ $t('expertBooking.requirements') }}
            </dt>
            <dd class="text-end text-highlighted">
              {{ draft.requirements || $t('expertBooking.notFilled') }}
            </dd>
          </div>
          <div
            v-if="draft.attachments.length"
            class="flex justify-between gap-3"
            data-testid="expert-booking-confirm-attachments"
          >
            <dt class="shrink-0 text-muted">
              {{ $t('expertBooking.attachment') }}
            </dt>
            <dd class="space-y-1 text-end text-highlighted">
              <p
                v-for="file in draft.attachments"
                :key="file.key"
              >
                {{ file.filename }}
              </p>
            </dd>
          </div>
        </dl>
      </section>

      <p
        v-if="!submitUnavailable && productState !== 'unavailable'"
        class="text-sm leading-6 text-muted"
      >
        {{ $t('expertBooking.submitHint') }}
      </p>

      <p
        v-if="submitError"
        class="text-sm text-error"
        data-testid="expert-booking-submit-error"
      >
        {{ submitError }}
      </p>

      <AppButton
        class="w-full"
        variant="outline"
        :disabled="pending || !canSubmit"
        data-testid="expert-booking-submit-pay"
        @click="onSubmit"
      >
        {{ pending ? $t('expertBooking.submitting') : $t('expertBooking.submitPay') }}
      </AppButton>
    </div>
  </div>
</template>

<script setup lang="ts">
import {
  draftToOrderCreateRequest,
  slotDraftToPreferredLabel
} from '~/utils/expert-booking'
import { isExpertBookingUnavailableError } from '~/utils/expert-booking-unavailable'
import { formatTwd } from '~/utils/first-order'
import { CandorApiError } from '~/utils/candor-api'

definePageMeta({
  layout: 'user',
  middleware: 'auth'
})

const localePath = useLocalePath()
const nuxtApp = useNuxtApp()
const { t, locale } = useI18n()
const auth = useAuthStore()
const bookingStore = useExpertBookingStore()
const bookingApi = useExpertBookingApi()
const ordersApi = useFirstOrderApi()

const gateLocked = ref(nuxtApp.isHydrating || !auth.isMember)
const pending = ref(false)
const submitError = ref('')
const submitUnavailable = ref(false)

const loginTo = computed(() =>
  `${localePath('/login')}?redirect=${encodeURIComponent(localePath('/expert-booking/confirm'))}&mode=login`
)

const draft = computed(() => bookingStore.draft)
const product = computed(() => bookingStore.product)
const productState = computed(() => bookingStore.productState)

const hasDraft = computed(() =>
  Boolean(
    draft.value.contactName.trim()
    && draft.value.phone.trim()
    && draft.value.email.trim()
    && draft.value.slots.length
  )
)

const productName = computed(() => {
  const p = product.value
  if (!p) {
    return t('expertBooking.productName')
  }
  if (locale.value.startsWith('en') && p.name_en?.trim()) {
    return p.name_en.trim()
  }
  return p.name_zh || t('expertBooking.productName')
})

const productPrice = computed(() => {
  const price = product.value?.price
  return typeof price === 'number' && Number.isFinite(price) ? price : null
})

const canSubmit = computed(() =>
  productState.value === 'ready'
  && productPrice.value != null
  && !submitUnavailable.value
)

const slotLabels = computed(() =>
  draft.value.slots.map(slot =>
    slotDraftToPreferredLabel(slot, locale.value)
  )
)

function syncGate() {
  gateLocked.value = !auth.isMember
}

async function refreshProduct() {
  bookingStore.setProductLoading()
  submitUnavailable.value = false
  try {
    const next = await bookingApi.getProduct()
    bookingStore.setProduct(next)
  } catch (error) {
    if (isExpertBookingUnavailableError(error)) {
      bookingStore.setProductUnavailable()
      return
    }
    bookingStore.setProductError()
  }
}

async function onSubmit() {
  if (pending.value || !hasDraft.value || !canSubmit.value) {
    return
  }
  pending.value = true
  submitError.value = ''
  try {
    const invoiceCarrier = (auth.user?.email || draft.value.email).trim()
    const body = draftToOrderCreateRequest(draft.value, {
      paymentMethod: 'card',
      invoiceType: 'member',
      invoiceCarrier,
      locale: locale.value
    })
    const created = await bookingApi.createBooking(body)
    try {
      await ordersApi.getOrder(created.id)
    } catch {
      // order detail may 404 until core lands; ignore
    }
    bookingStore.clearStorage()
    const redirectUrl = created.payment?.redirect_url
    if (redirectUrl) {
      window.location.assign(redirectUrl)
      return
    }
    const paid = created.payment_status === 'paid'
      || created.status === 'paid'
    if (paid) {
      await navigateTo({
        path: localePath('/app/orders/paid'),
        query: { id: created.id }
      })
      return
    }
    await navigateTo({
      path: localePath('/app/orders/pay-failed'),
      query: { id: created.id }
    })
  } catch (error) {
    if (error instanceof CandorApiError && error.statusCode === 401) {
      await navigateTo(loginTo.value as string)
      return
    }
    if (isExpertBookingUnavailableError(error)) {
      submitUnavailable.value = true
      bookingStore.setProductUnavailable()
      submitError.value = ''
      return
    }
    submitError.value = t('expertBooking.submitError')
  } finally {
    pending.value = false
  }
}

onMounted(async () => {
  await auth.ensureSession()
  bookingStore.hydrate()
  syncGate()
  if (!gateLocked.value && hasDraft.value) {
    await refreshProduct()
  }
})

watch(() => auth.isMember, syncGate)
</script>
