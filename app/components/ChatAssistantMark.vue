<script setup lang="ts">
/**
 * Isolates AssistantMark from chat bubble text redraws so CSS animations
 * keep running while the message streams.
 */
withDefaults(defineProps<{
  state?: 'idle' | 'thinking' | 'speaking'
}>(), {
  state: 'idle'
})
</script>

<template>
  <AssistantMark
    class="mt-0.5"
    :state="state"
  />
</template>
