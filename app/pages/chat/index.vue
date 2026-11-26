<template>
  <div class="flex min-h-0 flex-1 flex-col">
    <ChatPanel />
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  middleware: 'chat-layout'
})
</script>
