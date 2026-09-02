<template>
  <UDashboardGroup>
    <UDashboardSidebar collapsible>
      <template #header>
        <BrandMark />
      </template>

      <UNavigationMenu
        :items="navItems"
        orientation="vertical"
      />

      <template #footer>
        <UButton
          color="neutral"
          variant="ghost"
          block
          @click="logout"
        >
          {{ $t('nav.logout') }}
        </UButton>
      </template>
    </UDashboardSidebar>

    <slot />
  </UDashboardGroup>
</template>

<script setup lang="ts">
const localePath = useLocalePath()
const { t } = useI18n()
const auth = useAuthStore()

const navItems = computed(() => [[
  {
    label: t('nav.member'),
    to: localePath('/app'),
    icon: 'i-lucide-heart-pulse'
  },
  {
    label: t('nav.chat'),
    to: localePath('/app'),
    icon: 'i-lucide-message-circle'
  },
  {
    label: t('nav.handoff'),
    to: localePath('/app/handoff'),
    icon: 'i-lucide-handshake'
  }
]])

function logout() {
  auth.logout()
  navigateTo(localePath('/'))
}
</script>
