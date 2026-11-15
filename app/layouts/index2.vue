<template>
  <div
    class="relative flex flex-col bg-default text-default min-h-dvh"
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
          v-if="!mobileNavOpen"
          :on-photo="headerOverHero"
        />
        <div class="ms-auto flex items-center gap-2 sm:gap-3">
          <nav class="hidden items-center gap-2 text-sm sm:gap-3 lg:flex">
            <AppButton
              v-for="item in homeNavItems"
              :key="item.label"
              :to="item.to"
              variant="ghost"
              :data-testid="item.testId"
            >
              {{ item.label }}
            </AppButton>
          </nav>
          <AccountUser
            v-if="showMember"
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
          :data-testid="item.testId ? `${item.testId}-mobile` : undefined"
        >
          {{ item.label }}
        </AppButton>
      </nav>
    </header>

    <main class="flex-1">
      <slot />
    </main>

    <footer
      class="bg-brand-900 text-white dark:bg-brand-950"
      data-testid="index2-footer"
    >
      <div class="mx-auto w-full max-w-6xl px-4 py-12 sm:px-6 sm:py-14">
        <div class="grid gap-10 lg:grid-cols-4 lg:gap-8">
          <div>
            <NuxtLink
              :to="localePath('/index2')"
              class="inline-flex rounded-md focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
              :aria-label="$t('nav.home')"
            >
              <img
                :src="footerWordmarkSrc"
                alt=""
                class="h-9 w-auto"
                data-testid="footer-brand"
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
                  :key="item.label"
                >
                  <NuxtLink
                    :to="item.to"
                    class="text-sm text-white/70 underline-offset-2 transition hover:text-white hover:underline"
                    :data-testid="item.testId"
                  >
                    {{ item.label }}
                  </NuxtLink>
                </li>
              </ul>
            </div>
          </div>
        </div>

        <div class="mt-10 flex flex-col gap-4 border-t border-white/15 pt-6 sm:flex-row sm:items-center sm:justify-between">
          <div class="space-y-1">
            <p class="text-sm text-white/70">
              {{ $t('footer.copyright', { year: footerYear }) }}
            </p>
            <BuildVersion class="text-white/50" />
          </div>
        </div>
      </div>
    </footer>
  </div>
</template>

<script setup lang="ts">
const localePath = useLocalePath()
const auth = useAuthStore()
const { settled: authSettled, showMember } = useAuthClientSync()
const route = useRoute()
const { t } = useI18n()
const config = useRuntimeConfig()
const footerYear = new Date().getFullYear()
const footerWordmarkSrc = `${config.app.baseURL}brand-wordmark-dark.png`

type FooterItem = {
  label: string
  to: string
  testId?: string
}

type FooterColumn = {
  title: string
  items: FooterItem[]
}

const footerColumns = computed((): FooterColumn[] => [
  {
    title: t('footer.explore'),
    items: [
      {
        label: t('footer.explorePlans'),
        to: `${localePath('/index2')}#plans`,
        testId: 'footer-explore-plans'
      },
      {
        label: t('footer.exploreChat'),
        to: localePath('/chat'),
        testId: 'footer-explore-chat'
      },
      {
        label: t('footer.exploreHealth'),
        to: localePath('/app'),
        testId: 'footer-explore-health'
      }
    ]
  },
  {
    title: t('footer.support'),
    items: [
      {
        label: t('footer.supportOrders'),
        to: localePath('/app/orders'),
        testId: 'footer-support-orders'
      }
    ]
  },
  {
    title: t('footer.about'),
    items: [
      {
        label: t('footer.aboutUs'),
        to: localePath('/about'),
        testId: 'footer-about'
      },
      {
        label: t('footer.privacy'),
        to: localePath('/privacy'),
        testId: 'footer-privacy'
      },
      {
        label: t('footer.terms'),
        to: localePath('/terms'),
        testId: 'footer-terms'
      }
    ]
  }
])
const mobileNavOpen = ref(false)

const heroAtTop = ref(true)
const scrollSentinel = ref<HTMLElement | null>(null)
let heroObserver: IntersectionObserver | undefined

const headerOverHero = computed(() => heroAtTop.value && !mobileNavOpen.value)

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
  const items: Array<{ label: string, to: string, testId?: string }> = [
    { label: t('nav.plans'), to: `${localePath('/index2')}#plans` },
    { label: t('nav.chat'), to: localePath('/chat') }
  ]

  if (!authSettled.value) {
    return items
  }

  if (auth.hasSession) {
    items.push({
      label: t('nav.member'),
      to: localePath('/app'),
      testId: 'nav-member'
    })
  }

  if (!auth.isMember) {
    items.push({
      label: t('nav.login'),
      to: localePath('/login'),
      testId: 'nav-login'
    })
  }

  return items
})

watch(() => route.fullPath, () => {
  mobileNavOpen.value = false
})
</script>
