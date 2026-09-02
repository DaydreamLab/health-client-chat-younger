<template>
  <UDashboardPanel>
    <template #header>
      <UDashboardNavbar :title="$t('member.title')">
        <template #right>
          <LocaleSwitch />
          <ClientOnly>
            <UColorModeButton />
          </ClientOnly>
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <p class="text-muted">
        {{ $t('member.welcome') }}
      </p>
      <p class="text-sm text-dimmed">
        {{ $t('member.chatHint') }}
      </p>

      <CoachChat />
    </template>
  </UDashboardPanel>
</template>

<script setup lang="ts">
definePageMeta({
  layout: 'member',
  middleware: 'auth'
})
</script>
