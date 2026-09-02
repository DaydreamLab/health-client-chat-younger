<template>
  <div class="min-h-dvh flex bg-default text-default">
    <aside class="hidden w-56 shrink-0 flex-col border-e border-default bg-elevated p-4 lg:flex">
      <BrandMark />
      <nav class="mt-8 flex flex-col gap-1 text-sm">
        <AppButton
          :to="localePath('/app')"
          variant="ghost"
          class="justify-start"
        >
          {{ $t('nav.member') }}
        </AppButton>
        <AppButton
          :to="localePath('/app/handoff')"
          variant="ghost"
          class="justify-start"
        >
          {{ $t('nav.handoff') }}
        </AppButton>
      </nav>
      <div class="mt-auto">
        <AppButton
          variant="ghost"
          class="justify-start"
          @click="logout"
        >
          {{ $t('nav.logout') }}
        </AppButton>
      </div>
    </aside>

    <div class="flex min-w-0 flex-1 flex-col">
      <header class="flex h-16 items-center justify-end gap-3 border-b border-default px-4 sm:px-6 lg:hidden">
        <BrandMark />
        <div class="ms-auto flex items-center gap-2">
          <LocaleSwitch />
        </div>
      </header>
      <header class="hidden h-16 items-center justify-end gap-3 border-b border-default px-4 sm:px-6 lg:flex">
        <LocaleSwitch />
      </header>
      <main class="flex-1 p-4 sm:p-6">
        <slot />
      </main>
    </div>
  </div>
</template>

<script setup lang="ts">
const localePath = useLocalePath()
const auth = useAuthStore()

function logout() {
  auth.logout()
  navigateTo(localePath('/'))
}
</script>
