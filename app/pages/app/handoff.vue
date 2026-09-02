<template>
  <UDashboardPanel>
    <template #header>
      <UDashboardNavbar :title="$t('handoff.title')">
        <template #right>
          <LocaleSwitch />
          <ClientOnly>
            <UColorModeButton />
          </ClientOnly>
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <UPageCard
        :title="$t('handoff.title')"
        :description="$t('handoff.body')"
        icon="i-lucide-handshake"
        variant="subtle"
      />
    </template>
  </UDashboardPanel>
</template>

<script setup lang="ts">
definePageMeta({
  layout: 'member',
  middleware: 'auth'
})
</script>
