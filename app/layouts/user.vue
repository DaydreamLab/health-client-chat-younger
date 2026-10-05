<template>
  <div
    class="flex flex-row bg-default text-default"
    :class="isChat ? 'h-dvh overflow-hidden' : 'min-h-dvh'"
  >
    <aside
      id="user-sidebar"
      class="hidden w-20 shrink-0 flex-col items-center overflow-hidden border-e border-default bg-elevated p-2 lg:flex"
      data-testid="user-sidebar"
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
        <LocaleSwitch />
        <ColorModeSwitch />
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
        data-testid="user-header"
      >
        <button
          type="button"
          class="app-icon-toggle shrink-0"
          :aria-expanded="mobileNavOpen"
          :aria-label="$t('nav.menu')"
          aria-controls="user-mobile-nav"
          data-testid="user-nav-toggle"
          @click="mobileNavOpen = !mobileNavOpen"
        >
          <svg
            v-if="mobileNavOpen"
            class="size-5"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            aria-hidden="true"
          >
            <path d="M18 6 6 18" />
            <path d="m6 6 12 12" />
          </svg>
          <svg
            v-else
            class="size-5"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            aria-hidden="true"
          >
            <path d="M4 6h16" />
            <path d="M4 12h16" />
            <path d="M4 18h16" />
          </svg>
        </button>
        <BrandMark />
        <div class="ms-auto flex items-center gap-2">
          <AccountUser avatar-only />
          <LocaleSwitch />
          <ColorModeSwitch />
        </div>
      </header>
      <nav
        v-show="mobileNavOpen"
        id="user-mobile-nav"
        class="flex shrink-0 flex-col gap-1 border-b border-default px-4 py-2 text-sm lg:hidden"
        @click="mobileNavOpen = false"
      >
        <AppButton
          v-for="item in mobileNavItems"
          :key="item.label"
          :to="item.to"
          variant="ghost"
          class="justify-start"
          :class="item.active ? 'app-nav-active' : undefined"
          :data-testid="item.mobileTestId"
        >
          {{ item.label }}
          <span
            v-if="item.badge"
            class="app-badge app-badge-pending ms-1 scale-90"
          >
            {{ item.badge }}
          </span>
        </AppButton>
        <AppButton
          variant="ghost"
          class="justify-start"
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

interface UserNavItem extends NavigationMenuItem {
  testId?: string
  mobileTestId?: string
}

const localePath = useLocalePath()
const auth = useAuthStore()
const journey = useJourneyStore()
const route = useRoute()
const { t } = useI18n()
const mobileNavOpen = ref(false)

watch(() => route.fullPath, () => {
  mobileNavOpen.value = false
})

const isChat = computed(() => route.path.includes('/chat'))
const isOrders = computed(() => route.path.includes('/orders'))
const isRenewals = computed(() => route.path.includes('/renewals'))
const isRecommendations = computed(() => route.path.includes('/recommendations'))
const isProfile = computed(() => route.path.includes('/app/me'))
const isWearable = computed(() => route.path.includes('/app/wearables'))
const isHealth = computed(() => route.path.includes('/app')
  && !isChat.value
  && !isOrders.value
  && !isRenewals.value
  && !isRecommendations.value
  && !isProfile.value
  && !isWearable.value)
const collapsedNavUi = {
  link: 'flex-col gap-1 items-center',
  linkLabel: 'block text-[10px]/3 text-center'
}
const navItems = computed<UserNavItem[]>(() => [
  {
    label: t('nav.member'),
    icon: 'i-lucide-heart-pulse',
    to: localePath('/app'),
    active: isHealth.value
  },
  {
    label: t('nav.wearable'),
    icon: 'i-lucide-watch',
    to: localePath('/app/wearables'),
    active: isWearable.value,
    badge: t('nav.comingSoon'),
    testId: 'nav-wearable',
    mobileTestId: 'nav-wearable-mobile'
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
  },
  {
    label: t('nav.renewals'),
    icon: 'i-lucide-refresh-cw',
    to: localePath('/app/renewals'),
    active: isRenewals.value,
    badge: t('nav.comingSoon'),
    testId: 'nav-renewals',
    mobileTestId: 'nav-renewals-mobile'
  },
  {
    label: t('nav.profile'),
    icon: 'i-lucide-user-round',
    to: localePath('/app/me'),
    active: isProfile.value,
    testId: 'nav-profile',
    mobileTestId: 'nav-profile-mobile'
  }
])
const desktopNavItems = computed<NavigationMenuItem[]>(() => navItems.value.map((item) => {
  const desktopItem: NavigationMenuItem = {
    label: item.label,
    icon: item.icon,
    to: item.to,
    active: item.active,
    badge: item.badge
  }

  if (item.testId) {
    desktopItem['data-testid'] = item.testId
  }

  return desktopItem
}))
const mobileNavItems = computed(() => navItems.value.map(item => ({
  label: item.label,
  to: typeof item.to === 'string' ? item.to : localePath('/app'),
  active: Boolean(item.active),
  badge: typeof item.badge === 'string' ? item.badge : undefined,
  mobileTestId: item.mobileTestId
})))
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

function logout() {
  journey.clearSession()
  auth.logout()
  navigateTo(localePath('/'))
}
</script>
