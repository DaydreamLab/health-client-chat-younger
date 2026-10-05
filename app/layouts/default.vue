<template>
  <div
    class="relative flex flex-col bg-default text-default"
    :class="isChat ? 'h-dvh overflow-hidden' : 'min-h-dvh'"
  >
    <div
      ref="scrollSentinel"
      class="pointer-events-none absolute inset-x-0 top-0 h-2"
      aria-hidden="true"
    />
    <header
      class="sticky top-0 z-30 shrink-0 border-b transition-colors duration-200"
      :class="headerOverHero ? 'app-header-overlay border-transparent bg-transparent' : 'border-default bg-elevated'"
      :data-header-state="headerOverHero ? 'overlay' : 'solid'"
    >
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
        <BrandMark
          v-if="auth.isMember"
          :on-photo="headerOverHero"
        />
        <div
          v-else
          class="absolute left-1/2 -translate-x-1/2 lg:static lg:translate-x-0"
        >
          <BrandMark :on-photo="headerOverHero" />
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
      class="bg-brand-900 text-white dark:bg-brand-950"
    >
      <div class="mx-auto w-full max-w-6xl px-4 py-12 sm:px-6 sm:py-14">
        <div class="grid gap-10 lg:grid-cols-4 lg:gap-8">
          <div>
            <NuxtLink
              :to="localePath('/')"
              class="inline-flex rounded-md focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
              :aria-label="$t('nav.home')"
            >
              <img
                :src="footerWordmarkSrc"
                alt=""
                class="h-9 w-auto"
              >
            </NuxtLink>
            <p class="mt-4 text-sm font-medium">
              {{ $t('footer.tagline') }}
            </p>
            <p class="mt-2 max-w-xs text-sm leading-6 text-white/70">
              {{ $t('footer.blurb') }}
            </p>
          </div>

          <div class="grid grid-cols-2 gap-8 sm:grid-cols-3 lg:col-span-3">
            <div
              v-for="column in footerColumns"
              :key="column.title"
            >
              <p class="text-sm font-semibold">
                {{ column.title }}
              </p>
              <ul class="mt-4 space-y-2.5">
                <li
                  v-for="item in column.items"
                  :key="item"
                >
                  <span class="text-sm text-white/70">
                    {{ item }}
                  </span>
                </li>
              </ul>
              <div
                v-if="column.contact"
                class="mt-4 space-y-1"
              >
                <p class="text-sm text-white/70">
                  {{ $t('footer.email') }}
                </p>
                <p class="text-sm text-white/70">
                  {{ $t('footer.hours') }}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div class="mt-10 flex flex-col gap-4 border-t border-white/15 pt-6 sm:flex-row sm:items-center sm:justify-between">
          <p class="text-sm text-white/70">
            {{ $t('footer.copyright', { year: footerYear }) }}
          </p>
          <div class="flex items-center gap-4 text-white/70">
            <span
              role="img"
              :aria-label="$t('footer.socialInstagram')"
            >
              <svg
                class="size-5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="1.75"
                aria-hidden="true"
              >
                <rect
                  x="3"
                  y="3"
                  width="18"
                  height="18"
                  rx="5"
                />
                <circle
                  cx="12"
                  cy="12"
                  r="4"
                />
                <circle
                  cx="17.5"
                  cy="6.5"
                  r="0.9"
                  fill="currentColor"
                  stroke="none"
                />
              </svg>
            </span>
            <span
              role="img"
              :aria-label="$t('footer.socialFacebook')"
            >
              <svg
                class="size-5"
                viewBox="0 0 24 24"
                fill="currentColor"
                aria-hidden="true"
              >
                <path d="M14.2 8.5h2.3V5.8h-2.3c-2.1 0-3.7 1.6-3.7 3.7v1.8H8.2v2.7h2.3V20h2.8v-6h2.4l.4-2.7h-2.8V9.6c0-.6.5-1.1 1.1-1.1z" />
              </svg>
            </span>
            <span
              role="img"
              :aria-label="$t('footer.socialLine')"
            >
              <svg
                class="size-5"
                viewBox="0 0 24 24"
                fill="currentColor"
                aria-hidden="true"
              >
                <path d="M12 4.2c-4.6 0-8.3 3.1-8.3 7 0 3.4 3 6.3 7.1 6.8.3.1.7.2.8.5l.4 1.6c.1.4.5.4.7.2l2-1.2c.2-.1.5-.2.7-.2 3.8-.4 6.6-3.4 6.6-7.7 0-3.9-3.7-7-8-7z" />
              </svg>
            </span>
          </div>
        </div>
      </div>
    </footer>
  </div>
</template>

<script setup lang="ts">
const localePath = useLocalePath()
const auth = useAuthStore()
const route = useRoute()
const { t } = useI18n()
const config = useRuntimeConfig()
const footerYear = new Date().getFullYear()
const footerWordmarkSrc = `${config.app.baseURL}brand-wordmark-dark.png`

const footerColumns = computed(() => [
  {
    title: t('footer.explore'),
    items: [
      t('footer.explorePlans'),
      t('footer.exploreChat'),
      t('footer.exploreHealth')
    ],
    contact: false
  },
  {
    title: t('footer.support'),
    items: [
      t('footer.supportFaq'),
      t('footer.supportContact'),
      t('footer.supportOrders')
    ],
    contact: true
  },
  {
    title: t('footer.about'),
    items: [
      t('footer.aboutUs'),
      t('footer.privacy'),
      t('footer.terms')
    ],
    contact: false
  }
])
const mobileNavOpen = ref(false)

const isChat = computed(() => route.path.includes('/chat'))
const isHome = computed(() => route.path === '/' || route.path === '/en' || route.path === '/en/')
const heroAtTop = ref(true)
const scrollSentinel = ref<HTMLElement | null>(null)
let heroObserver: IntersectionObserver | undefined

const headerOverHero = computed(() => isHome.value && heroAtTop.value && !mobileNavOpen.value)

onMounted(() => {
  const node = scrollSentinel.value
  if (!node) {
    return
  }

  heroObserver = new IntersectionObserver(([entry]) => {
    heroAtTop.value = entry?.isIntersecting ?? true
  })
  heroObserver.observe(node)
})

onBeforeUnmount(() => {
  heroObserver?.disconnect()
})

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
