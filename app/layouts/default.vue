<template>
  <div class="min-h-dvh flex flex-col bg-default text-default">
    <header class="border-b border-default bg-elevated">
      <div class="mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-3 px-4 sm:px-6">
        <BrandMark />
        <nav class="flex items-center gap-3 text-sm">
          <NuxtLink
            :to="localePath('/#plans')"
            class="text-muted hover:text-highlighted"
          >
            {{ $t('nav.plans') }}
          </NuxtLink>
          <NuxtLink
            v-if="auth.isLoggedIn"
            :to="localePath('/app')"
            class="text-muted hover:text-highlighted"
          >
            {{ $t('nav.member') }}
          </NuxtLink>
          <NuxtLink
            v-else
            :to="localePath('/login')"
            class="text-muted hover:text-highlighted"
          >
            {{ $t('nav.login') }}
          </NuxtLink>
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
