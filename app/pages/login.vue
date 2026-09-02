<template>
  <UContainer class="py-16 max-w-md">
    <h1 class="text-2xl font-semibold text-highlighted">
      {{ $t('login.title') }}
    </h1>
    <p class="mt-2 text-muted">
      {{ $t('login.description') }}
    </p>

    <UForm
      class="mt-8 space-y-4"
      :schema="loginSchema"
      :state="state"
      @submit="onSubmit"
    >
      <UFormField
        name="email"
        :label="$t('login.email')"
      >
        <UInput
          v-model="state.email"
          type="email"
          class="w-full"
        />
      </UFormField>

      <UButton
        type="submit"
        block
      >
        {{ $t('login.submit') }}
      </UButton>
    </UForm>

    <p class="mt-6 text-sm text-muted">
      <NuxtLink
        :to="localePath('/')"
        class="underline"
      >
        {{ $t('login.guestHint') }}
      </NuxtLink>
    </p>
  </UContainer>
</template>

<script setup lang="ts">
import type { FormSubmitEvent } from '@nuxt/ui'
import { loginSchema, type LoginPayload } from '~/utils/login-schema'

const localePath = useLocalePath()
const route = useRoute()
const auth = useAuthStore()

const state = reactive<LoginPayload>({
  email: ''
})

function onSubmit(event: FormSubmitEvent<LoginPayload>) {
  auth.login(event.data.email)
  const redirect = typeof route.query.redirect === 'string'
    ? route.query.redirect
    : localePath('/app')
  return navigateTo(redirect)
}
</script>
