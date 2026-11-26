<template>
  <div
    class="flex min-h-0 flex-1 flex-col"
    data-testid="agent-v2-page"
  >
    <ChatPanel mode="v2" />
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  middleware: ['chat-layout', 'agent-v2']
})

const { t } = useI18n()

useHead({
  title: () => t('chat.title')
})
</script>
