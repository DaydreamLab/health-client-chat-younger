<template>
  <div class="space-y-6">
    <template v-if="previewLocked">
      <div class="flex flex-wrap items-center gap-2">
        <h1 class="text-2xl font-semibold text-highlighted">
          {{ $t('member.title') }}
        </h1>
      </div>
      <MemberAuthGate
        :title="$t('member.guestRequired')"
        :hint="$t('member.guestRequiredHint')"
        icon="i-lucide-heart-pulse"
        test-id="health-auth-gate"
        login-test-id="health-login"
        register-test-id="health-register"
        back-to-chat-test-id="health-back-chat"
      />
    </template>
    <MemberMyHealth v-else />
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  layout: 'user',
  middleware: 'auth'
})

const { memberGateLocked: previewLocked } = useAuthClientSync()
</script>
