<template>
  <div
    class="flex min-h-0 flex-1 flex-col"
    data-testid="agent-v2-page"
  >
    <MemberAuthShell
      skeleton-variant="default"
      skeleton-test-id="agent-v2-skeleton"
      login-test-id="agent-v2-login"
      test-id="agent-v2-auth-shell"
    >
      <AgentV2Panel />
    </MemberAuthShell>
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  layout: 'user',
  middleware: ['auth', 'agent-v2']
})

const { t } = useI18n()

useHead({
  title: () => t('agentV2.title')
})
</script>
