<template>
  <div class="flex h-dvh flex-row overflow-hidden bg-default text-default">
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
      <div class="mt-6 min-h-0 w-full flex-1 overflow-y-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
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
        <AccountUser
          v-if="auth.isMember"
          avatar-only
        />
        <GuestLoginControl
          v-else-if="auth.ready"
          variant="rail"
          test-id="guest-login-rail"
        />
        <div
          v-if="auth.isMember"
          class="w-full"
          data-testid="nav-logout"
        >
          <UNavigationMenu
            class="w-full"
            orientation="vertical"
            collapsed
            :items="logoutItems"
            :ui="collapsedNavUi"
          />
        </div>
      </div>
    </aside>

    <div class="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
      <header
        class="flex h-16 shrink-0 items-center gap-3 border-b border-default px-4 sm:px-6 lg:hidden"
        data-testid="user-header"
      >
        <button
          type="button"
          class="app-icon-toggle relative shrink-0"
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
          <span
            v-if="showHamUnreadDot"
            class="nav-unread-dot"
            data-testid="user-nav-toggle-unread-dot"
            aria-hidden="true"
          />
        </button>
        <div class="ms-auto flex items-center gap-2">
          <LocaleSwitch />
          <ColorModeSwitch />
          <AccountUser
            v-if="auth.isMember"
            avatar-only
          />
          <GuestLoginControl
            v-else-if="auth.ready"
            variant="chip"
            test-id="guest-login-header"
          />
        </div>
      </header>
      <nav
        v-show="mobileNavOpen"
        id="user-mobile-nav"
        data-testid="user-mobile-nav"
        class="flex shrink-0 flex-col gap-1 border-b border-default px-4 py-2 text-sm lg:hidden"
        @click="mobileNavOpen = false"
      >
        <AppButton
          :to="localePath('/')"
          variant="ghost"
          class="justify-start"
          data-testid="nav-home-mobile"
        >
          {{ $t('nav.home') }}
        </AppButton>
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
            v-if="item.countBadge"
            class="app-badge-count ms-auto"
            data-testid="nav-notifications-badge-mobile"
          >
            {{ item.countBadge }}
          </span>
          <span
            v-else-if="item.badge"
            class="app-badge app-badge-pending ms-1 scale-90"
          >
            {{ item.badge }}
          </span>
        </AppButton>
        <AppButton
          v-if="auth.isMember"
          variant="ghost"
          class="justify-start"
          data-testid="nav-logout-mobile"
          @click="logout"
        >
          {{ $t('nav.logout') }}
        </AppButton>
        <GuestLoginControl
          v-else-if="auth.ready"
          variant="drawer"
          test-id="guest-login-drawer"
        />
      </nav>
      <main
        class="flex min-h-0 flex-1 flex-col"
        :class="isChat || isChatAi
          ? 'overflow-hidden p-0'
          : 'overflow-y-auto p-4 sm:p-6 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden'"
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
  /** Coral unread count (notifications); distinct from coming-soon chip. */
  countBadge?: string
}

const localePath = useLocalePath()
const auth = useAuthStore()
const journey = useJourneyStore()
const notifications = useNotificationsStore()
const { notificationBadgeLabel } = useMemberNavExtension()
const route = useRoute()
const { t } = useI18n()
const mobileNavOpen = ref(false)

watch(() => route.fullPath, () => {
  mobileNavOpen.value = false
})

const isChatAi = computed(() => route.path.includes('/chat-ai'))
const isChat = computed(() => route.path.includes('/chat') && !isChatAi.value)
const isOrders = computed(() => route.path.includes('/orders'))
const isRenewals = computed(() => route.path.includes('/renewals'))
const isRecommendations = computed(() => route.path.includes('/recommendations'))
const isNotifications = computed(() => route.path.includes('/notifications'))
const isProfile = computed(() => route.path.includes('/app/me'))
const isWearable = computed(() => route.path.includes('/app/wearables'))
const isHealth = computed(() => route.path.includes('/app')
  && !isChat.value
  && !isOrders.value
  && !isRenewals.value
  && !isRecommendations.value
  && !isNotifications.value
  && !isProfile.value
  && !isWearable.value)
const showHamUnreadDot = computed(() => Boolean(notificationBadgeLabel.value))
const collapsedNavUi = {
  link: 'flex-col gap-1 items-center relative',
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
    label: t('nav.notifications'),
    icon: 'i-lucide-bell',
    to: localePath('/app/notifications'),
    active: isNotifications.value,
    countBadge: notificationBadgeLabel.value,
    testId: 'nav-notifications',
    mobileTestId: 'nav-notifications-mobile'
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
    active: item.active
  }

  if (item.countBadge) {
    desktopItem.badge = {
      label: item.countBadge,
      color: 'error',
      size: 'sm',
      class: 'app-nav-count-badge'
    }
  } else if (item.badge) {
    desktopItem.badge = item.badge
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
  countBadge: item.countBadge,
  mobileTestId: item.mobileTestId
})))

function syncNotificationBadge() {
  if (!auth.isMember) {
    notifications.clear()
    return
  }
  void notifications.refreshUnreadCount()
}

onMounted(() => {
  syncNotificationBadge()
})

watch(() => auth.isMember, () => {
  syncNotificationBadge()
})
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
