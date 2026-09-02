<template>
  <div
    class="flex bg-default text-default"
    :class="isChat ? 'h-dvh overflow-hidden' : 'min-h-dvh'"
  >
    <aside class="hidden w-56 shrink-0 flex-col border-e border-default bg-elevated p-4 lg:flex">
      <BrandMark />
      <nav class="mt-8 flex flex-col gap-1 text-sm">
        <AppButton
          :to="localePath('/app')"
          variant="ghost"
          :class="isHealth ? 'justify-start app-nav-active' : 'justify-start'"
        >
          {{ $t('nav.member') }}
        </AppButton>
        <AppButton
          :to="localePath('/chat')"
          variant="ghost"
          :class="isChat ? 'justify-start app-nav-active' : 'justify-start'"
        >
          {{ $t('nav.chat') }}
        </AppButton>
      </nav>
      <div class="mt-auto min-w-0 space-y-3 border-t border-default pt-4">
        <AccountUser />
        <AppButton
          variant="ghost"
          class="justify-start"
          @click="logout"
        >
          {{ $t('nav.logout') }}
        </AppButton>
      </div>
    </aside>

    <div
      class="flex min-w-0 flex-1 flex-col"
      :class="isChat ? 'min-h-0' : undefined"
    >
      <header class="flex h-16 shrink-0 items-center gap-3 border-b border-default px-4 sm:px-6">
        <BrandMark class="lg:hidden" />
        <p class="hidden text-sm font-medium text-highlighted lg:block">
          {{ headerTitle }}
        </p>
        <div class="ms-auto flex items-center gap-2">
          <AccountUser
            compact
            class="max-w-40 lg:hidden"
          />
          <LocaleSwitch />
          <ColorModeSwitch />
        </div>
      </header>
      <nav class="flex shrink-0 gap-1 border-b border-default px-4 py-2 text-sm lg:hidden">
        <AppButton
          :to="localePath('/app')"
          variant="ghost"
          :class="isHealth ? 'app-nav-active' : undefined"
        >
          {{ $t('nav.member') }}
        </AppButton>
        <AppButton
          :to="localePath('/chat')"
          variant="ghost"
          :class="isChat ? 'app-nav-active' : undefined"
        >
          {{ $t('nav.chat') }}
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
const localePath = useLocalePath()
const auth = useAuthStore()
const route = useRoute()
const { t } = useI18n()

const isChat = computed(() => route.path.includes('/chat'))
const isHealth = computed(() => route.path.includes('/app') && !isChat.value)
const headerTitle = computed(() => isChat.value ? t('nav.chat') : t('nav.member'))

function logout() {
  auth.logout()
  navigateTo(localePath('/'))
}
</script>
