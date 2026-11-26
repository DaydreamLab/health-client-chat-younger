<template>
  <div
    v-if="actions.length > 0"
    class="grid w-full grid-cols-1 gap-2 sm:grid-cols-2"
    data-testid="agent-v2-actions"
  >
    <AppButton
      v-for="action in actions"
      :key="action.key"
      type="button"
      :variant="isOfferRecommendAction(action) ? 'primary' : 'outline'"
      class="w-full justify-center"
      :data-testid="`agent-v2-action-${action.key}`"
      :disabled="disabled"
      @click="emit('select', action)"
    >
      {{ action.label }}
    </AppButton>
  </div>
</template>

<script setup lang="ts">
import {
  isOfferRecommendAction,
  type AgentV2Action
} from '~/utils/agent-v2'

defineProps<{
  actions: readonly AgentV2Action[]
  disabled?: boolean
}>()

const emit = defineEmits<{
  select: [action: AgentV2Action]
}>()
</script>
