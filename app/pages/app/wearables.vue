<template>
  <ComingSoonPanel
    test-id="wearables-soon"
    icon="i-lucide-watch"
    :eyebrow="$t('wearables.eyebrow')"
    :title="$t('wearables.title')"
    :subtitle="$t('wearables.subtitle')"
    :primary-to="localePath('/app')"
    :primary-label="$t('wearables.ctaHealth')"
    primary-test-id="wearables-back-health"
    :secondary-to="localePath('/chat')"
    :secondary-label="$t('wearables.ctaChat')"
    secondary-test-id="wearables-back-chat"
  />
</template>

<script setup lang="ts">
definePageMeta({
  layout: 'user',
  middleware: 'auth'
})

const localePath = useLocalePath()
</script>
