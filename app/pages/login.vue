<template>
  <div class="mx-auto max-w-md px-4 py-16 sm:px-6">
    <h1 class="text-2xl font-semibold text-highlighted">
      {{ $t('login.title') }}
    </h1>
    <p class="mt-2 text-muted">
      {{ $t('login.description') }}
    </p>

    <form
      class="mt-8 space-y-4"
      @submit.prevent="onSubmit"
    >
      <label class="block">
        <span class="mb-1.5 block text-sm text-highlighted">
          {{ $t('login.email') }}
        </span>
        <input
          v-model="email"
          type="email"
          required
          class="h-10 w-full rounded-md border border-default bg-elevated px-3 text-sm text-highlighted outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
        >
      </label>
      <p
        v-if="error"
        class="text-sm text-error"
      >
        {{ error }}
      </p>
      <AppButton
        type="submit"
        variant="primary"
        class="w-full"
      >
        {{ $t('login.submit') }}
      </AppButton>
    </form>

    <p class="mt-6 text-sm text-muted">
      <NuxtLink
        :to="localePath('/')"
        active-class=""
        exact-active-class=""
        class="underline"
      >
        {{ $t('login.guestHint') }}
      </NuxtLink>
    </p>
  </div>
</template>

<script setup lang="ts">
import { loginSchema } from '~/utils/login-schema'

const localePath = useLocalePath()
const route = useRoute()
const auth = useAuthStore()

const email = ref('')
const error = ref('')

async function onSubmit() {
  const result = loginSchema.safeParse({ email: email.value })
  if (!result.success) {
    error.value = result.error.issues[0]?.message ?? 'Invalid email'
    return
  }

  error.value = ''
  auth.login(result.data.email)
  await nextTick()

  const redirect = typeof route.query.redirect === 'string'
    ? route.query.redirect
    : '/app'

  await navigateTo(redirect)
}
</script>
