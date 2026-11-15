<template>
  <div data-testid="app-page">
    <MemberAuthShell
      skeleton-variant="dashboard"
      skeleton-test-id="app-skeleton"
      test-id="app-auth-shell"
    >
      <template #guest>
        <div
          class="mx-auto w-full max-w-md"
          data-testid="app-login"
        >
          <AuthLoginForm
            stay
            :show-description="false"
            :show-guest-link="false"
          />
        </div>
      </template>

      <MemberMyHealth />
    </MemberAuthShell>
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  layout: 'user',
  middleware: 'auth'
})
</script>
