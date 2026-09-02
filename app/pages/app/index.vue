<template>
  <div class="space-y-4">
    <h1 class="text-2xl font-semibold text-highlighted">
      {{ $t('member.title') }}
    </h1>
    <p class="text-muted">
      {{ $t('member.welcome') }}
    </p>
    <p class="text-sm text-dimmed">
      {{ $t('member.chatHint') }}
    </p>
    <CoachChat />
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  layout: 'member',
  middleware: 'auth'
})
</script>
