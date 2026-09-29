<template>
  <div class="mx-auto w-full max-w-lg space-y-6">
    <div>
      <h1 class="text-2xl font-semibold text-highlighted">
        {{ $t('profile.title') }}
      </h1>
      <p class="mt-1 text-sm text-muted">
        {{ $t('profile.subtitle') }}
      </p>
    </div>

    <section
      v-if="!auth.isMember"
      class="rounded-2xl border border-default bg-elevated p-5"
      data-testid="profile-guest"
    >
      <p class="text-sm text-highlighted">
        {{ $t('profile.guestHint') }}
      </p>
      <div class="mt-4 flex flex-wrap gap-2">
        <AppButton
          :to="registerRedirect"
          variant="primary"
          data-testid="profile-register"
        >
          {{ $t('profile.register') }}
        </AppButton>
        <AppButton
          :to="loginRedirect"
          variant="outline"
          data-testid="profile-login"
        >
          {{ $t('profile.login') }}
        </AppButton>
      </div>
    </section>

    <form
      v-else
      class="space-y-6"
      data-testid="profile-form"
      @submit.prevent="onSave"
    >
      <section class="space-y-4 rounded-2xl border border-default bg-elevated p-5">
        <h2 class="font-semibold text-highlighted">
          {{ $t('profile.accountSection') }}
        </h2>
        <label class="block">
          <span class="mb-1.5 block text-sm text-highlighted">{{ $t('profile.email') }}</span>
          <input
            :value="email"
            type="email"
            disabled
            readonly
            class="h-10 w-full rounded-md border border-default bg-muted px-3 text-sm text-muted outline-none"
            data-testid="profile-email"
          >
          <span class="mt-1 block text-xs text-muted">{{ $t('profile.emailReadonly') }}</span>
        </label>
        <label class="block">
          <span class="mb-1.5 block text-sm text-highlighted">{{ $t('profile.displayName') }}</span>
          <input
            v-model="displayName"
            name="display_name"
            autocomplete="nickname"
            class="h-10 w-full rounded-md border border-default bg-default px-3 text-sm text-highlighted outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
            data-testid="profile-display-name"
          >
        </label>
        <label class="block">
          <span class="mb-1.5 block text-sm text-highlighted">{{ $t('profile.currentPassword') }}</span>
          <input
            v-model="currentPassword"
            name="current_password"
            type="password"
            autocomplete="current-password"
            class="h-10 w-full rounded-md border border-default bg-default px-3 text-sm text-highlighted outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
            data-testid="profile-current-password"
          >
        </label>
        <label class="block">
          <span class="mb-1.5 block text-sm text-highlighted">{{ $t('profile.newPassword') }}</span>
          <input
            v-model="newPassword"
            name="password"
            type="password"
            autocomplete="new-password"
            :placeholder="$t('profile.newPasswordHint')"
            class="h-10 w-full rounded-md border border-default bg-default px-3 text-sm text-highlighted outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
            data-testid="profile-new-password"
          >
        </label>
      </section>

      <section class="space-y-4 rounded-2xl border border-default bg-elevated p-5">
        <h2 class="font-semibold text-highlighted">
          {{ $t('profile.recipientSection') }}
        </h2>
        <p class="text-sm text-muted">
          {{ $t('profile.recipientHint') }}
        </p>
        <label class="block">
          <span class="mb-1.5 block text-sm text-highlighted">{{ $t('checkout.name') }}</span>
          <input
            v-model="recipientName"
            name="name"
            autocomplete="name"
            class="h-10 w-full rounded-md border border-default bg-default px-3 text-sm text-highlighted outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
            data-testid="profile-recipient-name"
          >
        </label>
        <label class="block">
          <span class="mb-1.5 block text-sm text-highlighted">{{ $t('checkout.phone') }}</span>
          <input
            v-model="recipientPhone"
            name="phone"
            type="tel"
            autocomplete="tel"
            class="h-10 w-full rounded-md border border-default bg-default px-3 text-sm text-highlighted outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
            data-testid="profile-recipient-phone"
          >
        </label>
        <div class="block space-y-1.5">
          <span class="block text-sm text-highlighted">{{ $t('checkout.addressRegion') }}</span>
          <div class="grid grid-cols-2 gap-2">
            <label class="block min-w-0">
              <span class="sr-only">{{ $t('checkout.addressCity') }}</span>
              <select
                v-model="addressCity"
                name="address_city"
                autocomplete="address-level1"
                class="h-10 w-full rounded-md border border-default bg-default px-3 text-sm text-highlighted outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                data-testid="profile-address-city"
              >
                <option value="">
                  {{ $t('checkout.addressCity') }}
                </option>
                <option
                  v-for="city in taiwanCities"
                  :key="city"
                  :value="city"
                >
                  {{ city }}
                </option>
              </select>
            </label>
            <label class="block min-w-0">
              <span class="sr-only">{{ $t('checkout.addressDistrict') }}</span>
              <select
                v-model="addressDistrict"
                name="address_district"
                :disabled="!addressCity"
                autocomplete="address-level2"
                class="h-10 w-full rounded-md border border-default bg-default px-3 text-sm text-highlighted outline-none focus-visible:ring-2 focus-visible:ring-primary/40 disabled:opacity-50"
                data-testid="profile-address-district"
              >
                <option value="">
                  {{ $t('checkout.addressDistrict') }}
                </option>
                <option
                  v-for="district in addressDistricts"
                  :key="district"
                  :value="district"
                >
                  {{ district }}
                </option>
              </select>
            </label>
          </div>
        </div>
        <label class="block">
          <span class="mb-1.5 block text-sm text-highlighted">{{ $t('checkout.addressDetail') }}</span>
          <input
            v-model="addressDetail"
            name="address_detail"
            autocomplete="street-address"
            :placeholder="$t('checkout.addressDetailPlaceholder')"
            class="h-10 w-full rounded-md border border-default bg-default px-3 text-sm text-highlighted outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
            data-testid="profile-address-detail"
          >
        </label>
      </section>

      <p
        v-if="error"
        class="text-sm text-red-600 dark:text-red-400"
        data-testid="profile-error"
      >
        {{ error }}
      </p>
      <p
        v-if="success"
        class="text-sm text-success"
        data-testid="profile-success"
      >
        {{ $t('profile.saved') }}
      </p>

      <AppButton
        type="submit"
        variant="primary"
        :disabled="saving"
        data-testid="profile-save"
      >
        {{ saving ? $t('profile.saving') : $t('profile.save') }}
      </AppButton>
    </form>
  </div>
</template>

<script setup lang="ts">
import { CandorApiError } from '~/utils/candor-api'
import { districtsForCity, TAIWAN_CITIES } from '~/utils/taiwan-regions'

definePageMeta({
  layout: 'user',
  middleware: 'auth'
})

const localePath = useLocalePath()
const route = useRoute()
const { t } = useI18n()
const auth = useAuthStore()
const candor = useCandorApi()

const email = ref('')
const displayName = ref('')
const currentPassword = ref('')
const newPassword = ref('')
const recipientName = ref('')
const recipientPhone = ref('')
const addressCity = ref('')
const addressDistrict = ref('')
const addressDetail = ref('')
const hydratingAddress = ref(false)
const saving = ref(false)
const error = ref('')
const success = ref(false)
const loadError = ref(false)

const taiwanCities = TAIWAN_CITIES
const addressDistricts = computed(() => districtsForCity(addressCity.value))

const loginRedirect = computed(() =>
  `${localePath('/login')}?redirect=${encodeURIComponent(route.fullPath)}&mode=login`
)
const registerRedirect = computed(() =>
  `${localePath('/login')}?redirect=${encodeURIComponent(route.fullPath)}&mode=register`
)

watch(addressCity, () => {
  if (hydratingAddress.value) {
    return
  }
  addressDistrict.value = ''
})

async function loadProfile() {
  if (!auth.isMember) {
    return
  }
  loadError.value = false
  try {
    const me = await candor.me()
    email.value = me.email ?? ''
    displayName.value = me.display_name ?? ''
    const recipient = me.default_recipient
    if (!recipient) {
      return
    }
    hydratingAddress.value = true
    if (recipient.name) {
      recipientName.value = recipient.name
    }
    if (recipient.phone) {
      recipientPhone.value = recipient.phone
    }
    if (recipient.address_city) {
      addressCity.value = recipient.address_city
    }
    await nextTick()
    if (recipient.address_district) {
      addressDistrict.value = recipient.address_district
    }
    if (recipient.address_detail) {
      addressDetail.value = recipient.address_detail
    }
  } catch {
    loadError.value = true
    error.value = t('profile.loadError')
  } finally {
    hydratingAddress.value = false
  }
}

function recipientFieldsComplete() {
  return [
    recipientName.value,
    recipientPhone.value,
    addressCity.value,
    addressDistrict.value,
    addressDetail.value
  ].every(v => v.trim() !== '')
}

function recipientFieldsPartial() {
  const values = [
    recipientName.value,
    recipientPhone.value,
    addressCity.value,
    addressDistrict.value,
    addressDetail.value
  ]
  const filled = values.filter(v => v.trim() !== '').length
  return filled > 0 && filled < values.length
}

async function onSave() {
  error.value = ''
  success.value = false

  if (newPassword.value && !currentPassword.value) {
    error.value = t('profile.errorCurrentPasswordRequired')
    return
  }
  if (newPassword.value && newPassword.value.length < 10) {
    error.value = t('profile.errorWeakPassword')
    return
  }
  if (recipientFieldsPartial()) {
    error.value = t('profile.errorRecipientIncomplete')
    return
  }

  const body: {
    display_name: string
    password?: string
    current_password?: string
    default_recipient?: {
      name: string
      phone: string
      address_city: string
      address_district: string
      address_detail: string
    }
  } = {
    display_name: displayName.value.trim()
  }

  if (newPassword.value) {
    body.password = newPassword.value
    body.current_password = currentPassword.value
  }

  if (recipientFieldsComplete()) {
    body.default_recipient = {
      name: recipientName.value.trim(),
      phone: recipientPhone.value.trim(),
      address_city: addressCity.value.trim(),
      address_district: addressDistrict.value.trim(),
      address_detail: addressDetail.value.trim()
    }
  }

  saving.value = true
  try {
    const me = await candor.patchMe(body)
    auth.applyMe(me)
    currentPassword.value = ''
    newPassword.value = ''
    success.value = true
  } catch (err) {
    if (err instanceof CandorApiError) {
      if (err.errorCode === 'invalid_current_password') {
        error.value = t('profile.errorCurrentPassword')
      } else if (err.errorCode === 'weak_password') {
        error.value = t('profile.errorWeakPassword')
      } else {
        error.value = err.message || t('profile.errorSave')
      }
    } else {
      error.value = t('profile.errorSave')
    }
  } finally {
    saving.value = false
  }
}

onMounted(() => {
  void loadProfile()
})

watch(() => auth.isMember, (member) => {
  if (member) {
    void loadProfile()
  }
})
</script>
