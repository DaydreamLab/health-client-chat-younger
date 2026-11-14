<template>
  <div class="mx-auto max-w-md px-4 py-16 sm:px-6">
    <AuthLoginForm />
  </div>
</template>

<script setup lang="ts">
const localePath = useLocalePath()
const route = useRoute()
const auth = useAuthStore()
const { sync: syncAuth } = useAuthClientSync()

function redirectTarget() {
  return typeof route.query.redirect === 'string'
    ? route.query.redirect
    : localePath('/app')
}

onMounted(async () => {
  await syncAuth()
  if (auth.isMember) {
    await navigateTo(redirectTarget())
  }
})
</script>
