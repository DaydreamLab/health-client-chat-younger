<template>
  <div
    class="flex bg-default text-default"
    :class="isChat ? 'h-dvh overflow-hidden' : 'min-h-dvh'"
  >
    <aside
      id="member-sidebar"
      class="hidden w-20 shrink-0 flex-col items-center overflow-hidden border-e border-default bg-elevated p-2 lg:flex"
      data-testid="member-sidebar"
      data-collapsed="true"
    >
      <BrandMark
        compact
        class="shrink-0"
      />
      <div class="mt-6 min-h-0 w-full flex-1 overflow-y-auto">
        <UNavigationMenu
          class="w-full"
          orientation="vertical"
          collapsed
          :items="desktopNavItems"
          :ui="collapsedNavUi"
        />
      </div>
      <div class="mt-auto flex w-full min-w-0 shrink-0 flex-col items-center space-y-2 border-t border-default pt-4">
        <LocaleSwitch compact />
        <ColorModeSwitch compact />
        <AccountUser avatar-only />
        <UNavigationMenu
          class="w-full"
          orientation="vertical"
          collapsed
          :items="logoutItems"
          :ui="collapsedNavUi"
        />
      </div>
    </aside>

    <div
      class="flex min-w-0 flex-1 flex-col"
      :class="isChat ? 'min-h-0' : undefined"
    >
      <header
        class="flex h-16 shrink-0 items-center gap-3 border-b border-default px-4 sm:px-6 lg:hidden"
        data-testid="member-header"
      >
        <BrandMark />
        <div class="ms-auto flex items-center gap-2">
          <AccountUser
            compact
            class="max-w-40"
          />
          <LocaleSwitch />
          <ColorModeSwitch />
        </div>
      </header>
      <nav class="flex shrink-0 gap-1 border-b border-default px-4 py-2 text-sm lg:hidden">
        <AppButton
          v-for="item in navItems"
          :key="item.label"
          :to="navTo(item)"
          variant="ghost"
          :class="item.active ? 'app-nav-active' : undefined"
          :data-testid="item.mobileTestId"
        >
          {{ item.label }}
        </AppButton>
        <AppButton
          variant="ghost"
          class="ms-auto"
          @click="logout"
        >
          {{ $t('nav.logout') }}
        </AppButton>
      </nav>
      <main
        class="flex-1"
        :class="isChat ? 'flex min-h-0 flex-col p-0' : 'p-4 sm:p-6'"
      >
        <slot />
      </main>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { NavigationMenuItem } from '@nuxt/ui'

interface MemberNavItem extends NavigationMenuItem {
  testId?: string
  mobileTestId?: string
}

const localePath = useLocalePath()
const auth = useAuthStore()
const journey = useJourneyStore()
const route = useRoute()
const { t } = useI18n()

const isChat = computed(() => route.path.includes('/chat'))
const isOrders = computed(() => route.path.includes('/orders'))
const isRecommend = computed(() => route.path.includes('/recommend'))
const isHealth = computed(() => route.path.includes('/app') && !isChat.value && !isOrders.value && !isRecommend.value)
const collapsedNavUi = {
  link: 'flex-col gap-1 items-center',
  linkLabel: 'block text-[10px]/3 text-center'
}
const navItems = computed<MemberNavItem[]>(() => [
  {
    label: t('nav.member'),
    icon: 'i-lucide-heart-pulse',
    to: localePath('/app'),
    active: isHealth.value
  },
  {
    label: t('nav.chat'),
    icon: 'i-lucide-message-circle',
    to: localePath('/chat'),
    active: isChat.value,
    testId: 'nav-chat',
    mobileTestId: 'nav-chat-mobile'
  },
  {
    label: t('nav.orders'),
    icon: 'i-lucide-package',
    to: localePath('/app/orders'),
    active: isOrders.value,
    testId: 'nav-orders',
    mobileTestId: 'nav-orders-mobile'
  }
])
const desktopNavItems = computed<NavigationMenuItem[]>(() => navItems.value.map((item) => {
  const desktopItem: NavigationMenuItem = {
    label: item.label,
    icon: item.icon,
    to: item.to,
    active: item.active
  }

  if (item.testId) {
    desktopItem['data-testid'] = item.testId
  }

  return desktopItem
}))
const logoutItems = computed<NavigationMenuItem[]>(() => [
  {
    label: t('nav.logout'),
    icon: 'i-lucide-log-out',
    onSelect(event) {
      event.preventDefault()
      logout()
    }
  }
])

function navTo(item: MemberNavItem) {
  return typeof item.to === 'string' ? item.to : localePath('/app')
}

function logout() {
  journey.clearSession()
  auth.logout()
  navigateTo(localePath('/'))
}
</script>
