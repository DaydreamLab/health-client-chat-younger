<template>
  <div class="min-h-dvh flex flex-col bg-default text-default">
    <header class="border-b border-default bg-elevated">
      <div class="mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-3 px-4 sm:px-6">
        <BrandMark />
        <nav class="flex items-center gap-3 text-sm">
          <AppButton
            :to="`${localePath('/')}#plans`"
            variant="ghost"
          >
            {{ $t('nav.plans') }}
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
        </nav>
      </div>
    </header>

    <main class="flex-1">
      <slot />
    </main>

    <footer class="border-t border-default">
      <div class="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6">
        <p class="text-sm text-muted">
          {{ $t('footer') }}
        </p>
      </div>
    </footer>
  </div>
</template>

<script setup lang="ts">
const localePath = useLocalePath()
const auth = useAuthStore()
</script>
