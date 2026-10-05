<template>
  <div
    class="flex flex-col bg-default text-default"
    :class="isChat ? 'h-dvh overflow-hidden' : 'min-h-dvh'"
  >
    <header class="shrink-0 border-b border-default bg-elevated">
      <div class="relative mx-auto flex h-16 w-full max-w-6xl items-center gap-3 px-4 sm:px-6">
        <button
          type="button"
          class="app-icon-toggle shrink-0 lg:hidden"
          :aria-expanded="mobileNavOpen"
          :aria-label="$t('nav.menu')"
          aria-controls="home-mobile-nav"
          data-testid="home-nav-toggle"
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
        <BrandMark v-if="auth.isMember" />
        <div
          v-else
          class="absolute left-1/2 -translate-x-1/2 lg:static lg:translate-x-0"
        >
          <BrandMark />
        </div>
        <div class="ms-auto flex items-center gap-2 sm:gap-3">
          <nav class="hidden items-center gap-2 text-sm sm:gap-3 lg:flex">
            <AppButton
              v-for="item in homeNavItems"
              :key="item.label"
              :to="item.to"
              variant="ghost"
            >
              {{ item.label }}
            </AppButton>
          </nav>
          <AccountUser
            v-if="auth.isMember"
            avatar-only
          />
          <LocaleSwitch />
          <ColorModeSwitch />
        </div>
      </div>
      <nav
        v-show="mobileNavOpen"
        id="home-mobile-nav"
        class="mx-auto flex w-full max-w-6xl flex-col gap-1 px-4 py-2 text-sm sm:px-6 lg:hidden"
        @click="mobileNavOpen = false"
      >
        <AppButton
          v-for="item in homeNavItems"
          :key="item.label"
          :to="item.to"
          variant="ghost"
          class="justify-start"
        >
          {{ item.label }}
        </AppButton>
      </nav>
    </header>

    <main
      class="flex-1"
      :class="isChat ? 'flex min-h-0 flex-col' : undefined"
    >
      <slot />
    </main>

    <footer
      v-if="!isChat"
      class="border-t border-default"
    >
      <div class="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6">
        <p class="text-sm text-muted">
          {{ $t('footer', { year: footerYear }) }}
        </p>
      </div>
    </footer>
  </div>
</template>

<script setup lang="ts">
const localePath = useLocalePath()
const auth = useAuthStore()
const route = useRoute()
const { t } = useI18n()
const footerYear = new Date().getFullYear()
const mobileNavOpen = ref(false)

const isChat = computed(() => route.path.includes('/chat'))
const homeNavItems = computed(() => {
  const items = [
    { label: t('nav.plans'), to: `${localePath('/')}#plans` },
    { label: t('nav.chat'), to: localePath('/chat') }
  ]

  if (auth.hasSession) {
    items.push({ label: t('nav.member'), to: localePath('/app') })
  }

  if (!auth.isMember) {
    items.push({ label: t('nav.login'), to: localePath('/login') })
  }

  return items
})

watch(() => route.fullPath, () => {
  mobileNavOpen.value = false
})
</script>
