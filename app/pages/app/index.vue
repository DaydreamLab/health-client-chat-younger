<template>
  <div data-testid="app-page">
    <MemberAuthShell
      skeleton-variant="dashboard"
      skeleton-test-id="app-skeleton"
      login-test-id="app-login"
      test-id="app-auth-shell"
    >
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
