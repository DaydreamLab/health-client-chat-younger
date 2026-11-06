<template>
  <div
    class="mx-auto max-w-lg px-4 py-8 sm:px-6"
    data-testid="expert-booking-page"
  >
    <NuxtLink
      :to="localePath('/chat')"
      class="inline-flex items-center gap-1 text-sm font-medium text-primary"
      data-testid="expert-booking-back-chat"
    >
      <UIcon
        name="i-lucide-chevron-left"
        class="size-4"
      />
      {{ $t('expertBooking.backToChat') }}
    </NuxtLink>

    <!-- F-02：未登入會員 -->
    <div
      v-if="gateLocked"
      class="mt-10 flex flex-col items-center gap-3 text-center"
      data-testid="expert-booking-auth-gate"
    >
      <span class="flex size-14 items-center justify-center rounded-full bg-amber-500/15 text-amber-700 ring-1 ring-amber-500/30">
        <UIcon
          name="i-lucide-lock"
          class="size-7"
        />
      </span>
      <h1 class="text-xl font-semibold text-highlighted">
        {{ $t('expertBooking.guestRequired') }}
      </h1>
      <p class="max-w-sm text-sm leading-6 text-muted">
        {{ $t('expertBooking.guestRequiredHint') }}
      </p>
      <AppButton
        class="mt-2 w-full max-w-xs"
        variant="outline"
        :to="loginTo"
        data-testid="expert-booking-go-login"
      >
        {{ $t('expertBooking.goLogin') }}
      </AppButton>
    </div>

    <!-- F-03：說明＋表單同頁 -->
    <div
      v-else
      class="mt-6 space-y-8"
      data-testid="expert-booking-form-shell"
    >
      <header class="space-y-2">
        <h1 class="text-2xl font-semibold text-highlighted">
          {{ $t('expertBooking.title') }}
        </h1>
        <p class="text-sm leading-6 text-muted">
          {{ $t('expertBooking.subtitle') }}
        </p>
      </header>

      <section
        class="rounded-2xl border border-amber-500/40 bg-amber-500/5 p-5"
        data-testid="expert-booking-product-card"
      >
        <div class="flex items-start justify-between gap-3">
          <h2 class="font-semibold text-highlighted">
            {{ productName }}
          </h2>
          <p class="shrink-0 text-base font-semibold tabular-nums text-primary">
            {{ formatTwd(productPrice) }}
          </p>
        </div>
        <ul class="mt-3 list-disc space-y-1.5 ps-5 text-sm leading-6 text-muted">
          <li>{{ $t('expertBooking.bulletChannel') }}</li>
          <li>{{ $t('expertBooking.bulletIndependent') }}</li>
          <li>{{ $t('expertBooking.bulletRecommendations') }}</li>
        </ul>
      </section>

      <form
        class="space-y-5"
        data-testid="expert-booking-form"
        @submit.prevent="onNext"
      >
        <h2 class="text-lg font-semibold text-highlighted">
          {{ $t('expertBooking.formTitle') }}
        </h2>

        <label class="block">
          <span class="mb-1.5 block text-sm text-highlighted">
            {{ $t('expertBooking.contactName') }}
            <span class="text-error">*</span>
          </span>
          <input
            v-model="form.contactName"
            type="text"
            required
            autocomplete="name"
            class="h-10 w-full rounded-md border border-default bg-elevated px-3 text-sm text-highlighted outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
            data-testid="expert-booking-name"
          >
        </label>

        <label class="block">
          <span class="mb-1.5 block text-sm text-highlighted">
            {{ $t('expertBooking.phone') }}
            <span class="text-error">*</span>
          </span>
          <input
            v-model="form.phone"
            type="tel"
            required
            autocomplete="tel"
            class="h-10 w-full rounded-md border border-default bg-elevated px-3 text-sm text-highlighted outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
            data-testid="expert-booking-phone"
          >
        </label>

        <label class="block">
          <span class="mb-1.5 block text-sm text-highlighted">
            {{ $t('expertBooking.email') }}
            <span class="text-error">*</span>
          </span>
          <input
            v-model="form.email"
            type="email"
            required
            autocomplete="email"
            class="h-10 w-full rounded-md border border-default bg-elevated px-3 text-sm text-highlighted outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
            data-testid="expert-booking-email"
          >
          <span class="mt-1 block text-xs text-muted">
            {{ $t('expertBooking.emailHint') }}
          </span>
        </label>

        <label class="block">
          <span class="mb-1.5 block text-sm text-highlighted">
            {{ $t('expertBooking.lineId') }}
          </span>
          <input
            v-model="form.lineId"
            type="text"
            :placeholder="$t('expertBooking.optional')"
            class="h-10 w-full rounded-md border border-default bg-elevated px-3 text-sm text-highlighted outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
            data-testid="expert-booking-line"
          >
        </label>

        <div>
          <span class="mb-1.5 block text-sm text-highlighted">
            {{ $t('expertBooking.attachment') }}
          </span>
          <label
            class="inline-flex cursor-pointer items-center gap-2 rounded-md border border-dashed border-default bg-elevated px-3 py-2 text-sm text-muted hover:border-primary/40"
            data-testid="expert-booking-attachment"
          >
            <UIcon
              name="i-lucide-plus"
              class="size-4"
            />
            {{ uploadPending ? $t('expertBooking.uploading') : $t('expertBooking.uploadFile') }}
            <input
              type="file"
              class="sr-only"
              accept=".pdf,image/jpeg,image/png,image/webp"
              :disabled="uploadPending || form.attachments.length >= 5"
              @change="onFileChange"
            >
          </label>
          <ul
            v-if="form.attachments.length"
            class="mt-2 space-y-1 text-xs text-muted"
            data-testid="expert-booking-attachment-list"
          >
            <li
              v-for="(file, index) in form.attachments"
              :key="file.key"
              class="flex items-center justify-between gap-2"
            >
              <span>{{ file.filename }}</span>
              <button
                type="button"
                class="underline"
                :data-testid="`expert-booking-attachment-remove-${index}`"
                @click="removeAttachment(index)"
              >
                {{ $t('expertBooking.removeSlot') }}
              </button>
            </li>
          </ul>
          <p
            v-if="uploadError"
            class="mt-1 text-xs text-error"
            data-testid="expert-booking-upload-error"
          >
            {{ uploadError }}
          </p>
        </div>

        <div class="space-y-3">
          <div class="flex items-baseline justify-between gap-2">
            <span class="text-sm text-highlighted">
              {{ $t('expertBooking.preferredSlots') }}
              <span class="text-error">*</span>
            </span>
            <span class="text-xs text-muted">
              {{ $t('expertBooking.slotsHint', { n: form.slots.length }) }}
            </span>
          </div>
          <div
            v-for="(slot, index) in form.slots"
            :key="index"
            class="grid gap-2 rounded-xl border border-default bg-elevated p-3 sm:grid-cols-[1fr_auto_auto_auto]"
            :data-testid="`expert-booking-slot-${index}`"
          >
            <input
              v-model="slot.date"
              type="date"
              required
              class="h-10 rounded-md border border-default bg-default px-3 text-sm text-highlighted outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
            >
            <input
              v-model="slot.startTime"
              type="time"
              required
              class="h-10 rounded-md border border-default bg-default px-3 text-sm text-highlighted outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
            >
            <input
              v-model="slot.endTime"
              type="time"
              required
              class="h-10 rounded-md border border-default bg-default px-3 text-sm text-highlighted outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
            >
            <AppButton
              v-if="form.slots.length > 1"
              type="button"
              variant="ghost"
              class="!h-10"
              :data-testid="`expert-booking-slot-remove-${index}`"
              @click="removeSlot(index)"
            >
              {{ $t('expertBooking.removeSlot') }}
            </AppButton>
          </div>
          <AppButton
            v-if="form.slots.length < 3"
            type="button"
            variant="outline"
            data-testid="expert-booking-add-slot"
            @click="addSlot"
          >
            {{ $t('expertBooking.addSlot') }}
          </AppButton>
          <p class="text-xs text-muted">
            {{ $t('expertBooking.slotsNote') }}
          </p>
        </div>

        <label class="block">
          <span class="mb-1.5 block text-sm text-highlighted">
            {{ $t('expertBooking.requirements') }}
            <span class="text-xs text-muted">
              （{{ $t('expertBooking.optional') }}）
            </span>
          </span>
          <textarea
            v-model="form.requirements"
            rows="4"
            class="w-full rounded-md border border-default bg-elevated px-3 py-2 text-sm text-highlighted outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
            data-testid="expert-booking-requirements"
          />
        </label>

        <p
          v-if="formError"
          class="text-sm text-error"
          data-testid="expert-booking-form-error"
        >
          {{ formError }}
        </p>

        <AppButton
          type="submit"
          variant="outline"
          class="w-full"
          data-testid="expert-booking-next"
        >
          {{ $t('expertBooking.nextConfirm') }}
        </AppButton>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import {
  emptyExpertBookingSlot,
  expertBookingFormSchema,
  EXPERT_BOOKING_PRICE_TWD,
  type ExpertBookingDraft
} from '~/utils/expert-booking'
import { formatTwd } from '~/utils/first-order'

definePageMeta({
  layout: 'user',
  middleware: 'auth'
})

const localePath = useLocalePath()
const nuxtApp = useNuxtApp()
const { t } = useI18n()
const auth = useAuthStore()
const bookingStore = useExpertBookingStore()
const bookingApi = useExpertBookingApi()

const gateLocked = ref(nuxtApp.isHydrating || !auth.isMember)
const formError = ref('')
const uploadError = ref('')
const uploadPending = ref(false)
const productPrice = ref(EXPERT_BOOKING_PRICE_TWD)
const productName = ref(t('expertBooking.productName'))
const form = reactive<ExpertBookingDraft>({
  contactName: '',
  phone: '',
  email: '',
  lineId: '',
  slots: [emptyExpertBookingSlot()],
  requirements: '',
  attachments: []
})

const loginTo = computed(() =>
  `${localePath('/login')}?redirect=${encodeURIComponent(localePath('/expert-booking'))}&mode=login`
)

function syncGate() {
  gateLocked.value = !auth.isMember
}

function seedFormFromStore() {
  bookingStore.hydrate()
  const draft = bookingStore.draft
  form.contactName = draft.contactName
  form.phone = draft.phone
  form.email = draft.email || auth.user?.email || ''
  form.lineId = draft.lineId
  form.slots = draft.slots.length
    ? draft.slots.map(s => ({ ...s }))
    : [emptyExpertBookingSlot()]
  form.requirements = draft.requirements
  form.attachments = Array.isArray(draft.attachments)
    ? draft.attachments.map(a => ({ ...a }))
    : []

  if (!form.contactName && auth.displayName) {
    form.contactName = auth.displayName
  }
}

function addSlot() {
  if (form.slots.length >= 3) {
    return
  }
  form.slots.push(emptyExpertBookingSlot())
}

function removeSlot(index: number) {
  if (form.slots.length <= 1) {
    return
  }
  form.slots.splice(index, 1)
}

function removeAttachment(index: number) {
  form.attachments.splice(index, 1)
}

async function onFileChange(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file || form.attachments.length >= 5 || uploadPending.value) {
    return
  }
  uploadPending.value = true
  uploadError.value = ''
  try {
    const ack = await bookingApi.uploadAttachment(file)
    form.attachments.push(ack)
  } catch {
    uploadError.value = t('expertBooking.uploadError')
  } finally {
    uploadPending.value = false
  }
}

function onNext() {
  formError.value = ''
  const parsed = expertBookingFormSchema.safeParse({
    contactName: form.contactName,
    phone: form.phone,
    email: form.email,
    lineId: form.lineId,
    slots: form.slots,
    requirements: form.requirements,
    attachments: form.attachments
  })
  if (!parsed.success) {
    formError.value = t('expertBooking.formInvalid')
    return
  }
  bookingStore.setDraft({
    contactName: form.contactName.trim(),
    phone: form.phone.trim(),
    email: form.email.trim(),
    lineId: form.lineId.trim(),
    slots: form.slots.map(s => ({ ...s })),
    requirements: form.requirements.trim(),
    attachments: form.attachments.map(a => ({ ...a }))
  })
  return navigateTo(localePath('/expert-booking/confirm'))
}

onMounted(async () => {
  await auth.ensureSession()
  syncGate()
  if (!gateLocked.value) {
    seedFormFromStore()
    try {
      const product = await bookingApi.getProduct()
      productPrice.value = product.price
      if (product.name_zh) {
        productName.value = product.name_zh
      }
    } catch {
      productPrice.value = EXPERT_BOOKING_PRICE_TWD
    }
  }
})

watch(() => auth.isMember, () => {
  syncGate()
  if (!gateLocked.value) {
    seedFormFromStore()
  }
})
</script>
