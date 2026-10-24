<template>
  <div
    v-if="visible"
    class="pointer-events-none fixed inset-x-0 bottom-0 z-50 flex justify-center p-3 sm:p-4"
    data-testid="cookie-consent-banner"
    role="dialog"
    aria-modal="false"
    :aria-label="$t('cookieConsent.ariaLabel')"
  >
    <div
      class="pointer-events-auto flex w-full max-w-3xl flex-col gap-3 rounded-xl border border-default bg-elevated px-4 py-3 shadow-lg sm:flex-row sm:items-center sm:gap-4 sm:px-5 sm:py-4"
    >
      <p class="flex-1 text-sm leading-6 text-highlighted">
        {{ $t('cookieConsent.message') }}
        <NuxtLink
          :to="localePath('/privacy')"
          class="font-semibold text-primary underline underline-offset-2"
          data-testid="cookie-consent-privacy-link"
        >
          {{ $t('cookieConsent.privacyLink') }}
        </NuxtLink>
      </p>
      <AppButton
        class="shrink-0 self-stretch sm:self-auto"
        variant="primary"
        data-testid="cookie-consent-accept"
        @click="accept"
      >
        {{ $t('cookieConsent.accept') }}
      </AppButton>
    </div>
  </div>
</template>

<script setup lang="ts">
import {
  needsPrivacyConsent,
  readConsentedPrivacyVersion,
  writeConsentedPrivacyVersion
} from '~/utils/privacy-consent'

const localePath = useLocalePath()
const candor = useCandorApi()

const visible = ref(false)
const policyVersion = ref<string | null>(null)

async function refresh() {
  if (!import.meta.client) {
    return
  }

  try {
    const policy = await candor.getPrivacyPolicy()
    policyVersion.value = policy.version
    visible.value = needsPrivacyConsent(
      policy.version,
      readConsentedPrivacyVersion()
    )
  } catch {
    // Without a live version we cannot key consent — keep banner hidden.
    visible.value = false
    policyVersion.value = null
  }
}

function accept() {
  const version = policyVersion.value
  if (!version) {
    visible.value = false
    return
  }

  writeConsentedPrivacyVersion(version)
  visible.value = false
}

onMounted(() => {
  void refresh()
})
</script>
