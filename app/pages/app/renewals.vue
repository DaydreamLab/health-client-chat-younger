<template>
  <ComingSoonPanel
    test-id="renewals-soon"
    icon="i-lucide-refresh-cw"
    :eyebrow="$t('renewals.eyebrow')"
    :title="$t('renewals.title')"
    :subtitle="$t('renewals.subtitle')"
    :primary-to="localePath('/app')"
    :primary-label="$t('renewals.ctaHealth')"
    primary-test-id="renewals-back-health"
    :secondary-to="localePath('/chat')"
    :secondary-label="$t('renewals.ctaChat')"
    secondary-test-id="renewals-back-chat"
  />
</template>

<script setup lang="ts">
definePageMeta({
  layout: 'user',
  middleware: 'auth'
})

const localePath = useLocalePath()
</script>
