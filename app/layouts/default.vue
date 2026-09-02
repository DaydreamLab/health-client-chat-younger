<template>
  <div
    class="flex flex-col bg-default text-default"
    :class="isChat ? 'h-dvh overflow-hidden' : 'min-h-dvh'"
  >
    <header class="shrink-0 border-b border-default bg-elevated">
      <div class="mx-auto flex min-h-16 w-full max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-2 sm:px-6">
        <BrandMark />
        <nav class="flex items-center gap-2 text-sm sm:gap-3">
          <AppButton
            :to="`${localePath('/')}#plans`"
            variant="ghost"
          >
            {{ $t('nav.plans') }}
          </AppButton>
          <AppButton
            :to="localePath('/chat')"
            variant="ghost"
          >
            {{ $t('nav.chat') }}
          </AppButton>
          <AppButton
            v-if="auth.isLoggedIn"
            :to="localePath('/app')"
            variant="ghost"
          >
            {{ $t('nav.member') }}
          </AppButton>
          <AppButton
            v-else
            :to="localePath('/login')"
            variant="ghost"
          >
            {{ $t('nav.login') }}
          </AppButton>
          <LocaleSwitch />
          <ColorModeSwitch />
        </nav>
      </div>
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
const footerYear = new Date().getFullYear()

const isChat = computed(() => route.path.includes('/chat'))
</script>
