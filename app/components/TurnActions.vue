<script setup lang="ts">
import type { GreetingOption } from '~/utils/candor-api'

defineProps<{
  choices: GreetingOption[]
  selectedCodes: string[]
  showConfirm: boolean
  confirmDisabled: boolean
  showUpload: boolean
  uploadDisabled: boolean
  showCheckup: boolean
  checkupUrl: string
  showRecommend: boolean
  showRetry: boolean
  pending: boolean
}>()

const emit = defineEmits<{
  choice: [option: GreetingOption]
  confirm: []
  upload: []
  recommend: []
  retry: []
}>()
</script>

<template>
  <div
    v-if="choices.length || showConfirm || showUpload || showCheckup || showRecommend || showRetry"
    class="turn-actions"
    data-testid="chat-turn-actions"
  >
    <div
      v-if="showCheckup && checkupUrl"
      class="turn-actions-row"
    >
      <AppButton
        :href="checkupUrl"
        target="_blank"
        rel="noopener noreferrer"
        variant="outline"
        data-testid="chat-message-checkup"
      >
        {{ $t('chat.checkupLink') }}
      </AppButton>
    </div>
    <div
      v-if="choices.length"
      class="turn-actions-row"
      data-testid="chat-quiz-options"
    >
      <button
        v-for="option in choices"
        :key="option.code"
        type="button"
        class="app-chip"
        :class="{ 'ring-2 ring-primary': selectedCodes.includes(option.code) }"
        :data-testid="`chat-quiz-option-${option.code}`"
        :disabled="pending"
        @click="emit('choice', option)"
      >
        {{ option.label }}
      </button>
    </div>
    <div
      v-if="showConfirm"
      class="turn-actions-row turn-actions-confirm"
    >
      <AppButton
        type="button"
        data-testid="chat-quiz-confirm"
        :disabled="confirmDisabled"
        @click="emit('confirm')"
      >
        {{ $t('chat.confirmSelection') }}
      </AppButton>
    </div>
    <div
      v-if="showUpload || showRecommend || showRetry"
      class="turn-actions-row"
    >
      <AppButton
        v-if="showUpload"
        variant="outline"
        data-testid="chat-message-upload"
        :disabled="uploadDisabled"
        @click="emit('upload')"
      >
        {{ $t('chat.upload') }}
      </AppButton>
      <AppButton
        v-if="showRecommend"
        data-testid="chat-view-recommend"
        @click="emit('recommend')"
      >
        {{ $t('chat.viewRecommend') }}
      </AppButton>
      <AppButton
        v-if="showRetry"
        variant="outline"
        data-testid="chat-report-retry"
        @click="emit('retry')"
      >
        {{ $t('chat.reportRetry') }}
      </AppButton>
    </div>
  </div>
</template>

<style scoped>
.turn-actions {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 0.5rem;
  margin-top: 0.5rem;
  padding: 0;
  border: 0;
  background: transparent;
}

.turn-actions-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: flex-start;
  gap: 0.5rem;
}

.turn-actions-confirm {
  justify-content: flex-end;
}

.turn-actions :deep(.app-btn) {
  height: 2rem;
  min-height: 2rem;
  padding-inline: 0.75rem;
  font-size: 0.8125rem;
}
</style>
