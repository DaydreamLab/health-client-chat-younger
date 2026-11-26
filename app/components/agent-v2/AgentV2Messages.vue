<template>
  <div
    class="flex w-full flex-col gap-3"
    data-testid="agent-v2-messages"
  >
    <div
      v-for="message in messages"
      :key="message.id"
      class="flex w-full"
      :class="message.role === 'user' ? 'justify-end' : 'justify-start'"
      :data-testid="`agent-v2-message-${message.role}`"
      :data-message-id="message.id"
    >
      <div
        class="max-w-[85%] whitespace-pre-wrap break-words px-4 py-3 text-sm leading-6"
        :class="message.role === 'user'
          ? 'rounded-lg bg-elevated text-highlighted'
          : 'text-highlighted'"
      >
        {{ message.text }}
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { AgentV2Message } from '~/utils/agent-v2'

defineProps<{
  messages: readonly AgentV2Message[]
}>()
</script>
