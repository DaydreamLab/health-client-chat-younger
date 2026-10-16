<template>
  <div class="flex min-h-0 flex-1 flex-col">
    <ChatPanel flow="standard" />
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  middleware: 'chat-layout',
  flow: 'standard'
})
</script>
