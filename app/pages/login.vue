<template>
  <div class="mx-auto max-w-md px-4 py-16 sm:px-6">
    <h1 class="text-2xl font-semibold text-highlighted">
      {{ mode === 'login' ? $t('login.title') : $t('login.registerTitle') }}
    </h1>
    <p class="mt-2 text-muted">
      {{ mode === 'login' ? $t('login.description') : $t('login.registerDescription') }}
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
          autocomplete="email"
          class="h-10 w-full rounded-md border border-default bg-elevated px-3 text-sm text-highlighted outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
        >
      </label>
      <label class="block">
        <span class="mb-1.5 block text-sm text-highlighted">
          {{ $t('login.password') }}
        </span>
        <input
          v-model="password"
          type="password"
          required
          minlength="10"
          autocomplete="current-password"
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
        :disabled="pending"
      >
        {{ mode === 'login' ? $t('login.submit') : $t('login.registerSubmit') }}
      </AppButton>
    </form>

    <p class="mt-4 text-sm text-muted">
      <button
        type="button"
        class="underline"
        @click="toggleMode"
      >
        {{ mode === 'login' ? $t('login.switchToRegister') : $t('login.switchToLogin') }}
      </button>
    </p>

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
import { CandorApiError } from '~/utils/candor-api'
import { loginSchema } from '~/utils/login-schema'

const localePath = useLocalePath()
const route = useRoute()
const auth = useAuthStore()
const { t } = useI18n()

const email = ref('')
const password = ref('')
const error = ref('')
const pending = ref(false)
const mode = ref<'login' | 'register'>('login')

function toggleMode() {
  mode.value = mode.value === 'login' ? 'register' : 'login'
  error.value = ''
}

async function onSubmit() {
  const result = loginSchema.safeParse({
    email: email.value,
    password: password.value
  })
  if (!result.success) {
    error.value = result.error.issues[0]?.message ?? t('login.invalid')
    return
  }

  error.value = ''
  pending.value = true
  try {
    if (mode.value === 'login') {
      await auth.login(result.data.email, result.data.password)
    } else {
      await auth.register(result.data.email, result.data.password)
    }
    await nextTick()

    const redirect = typeof route.query.redirect === 'string'
      ? route.query.redirect
      : '/app'

    await navigateTo(redirect)
  } catch (err) {
    if (err instanceof CandorApiError) {
      if (err.errorCode === 'already_member') {
        error.value = t('login.alreadyMember')
        mode.value = 'login'
      } else if (err.statusCode === 401) {
        error.value = t('login.invalidCredentials')
      } else {
        error.value = err.message
      }
    } else {
      error.value = t('login.invalid')
    }
  } finally {
    pending.value = false
  }
}
</script>
