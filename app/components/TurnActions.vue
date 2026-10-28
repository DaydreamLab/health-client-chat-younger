<script setup lang="ts">
import type { GreetingOption } from '~/utils/candor-api'
import type { VitalsField } from '~/utils/reply-actions'

const props = defineProps<{
  choices: GreetingOption[]
  selectedCodes: string[]
  showConfirm: boolean
  confirmDisabled: boolean
  showUpload: boolean
  uploadDisabled: boolean
  showCheckup: boolean
  checkupUrl: string
  showWantMoreTests: boolean
  wantMoreTestsUrl: string
  showSubmitReview: boolean
  showViewRecommend: boolean
  showRetry: boolean
  pending: boolean
  /** `standard` never submits expert review; the recommend button stays「查看推薦方案」. */
  flow?: 'standard'
  /** ask_vitals fields from reply_actions (shown one-at-a-time in order). */
  vitalsFields?: VitalsField[]
  vitalsDisabled?: boolean
}>()

const emit = defineEmits<{
  choice: [option: GreetingOption]
  confirm: []
  upload: []
  submitReview: []
  recommend: []
  retry: []
  /** One field per confirm (multi-field = sequential cards). */
  vitalsSubmit: [values: Partial<Record<VitalsField, number>>]
}>()

const activeVitalsFields = computed(() => props.vitalsFields ?? [])

/** One card at a time: always the head of the remaining fields queue. */
const activeVitalsField = computed<VitalsField | null>(() =>
  activeVitalsFields.value[0] ?? null
)

function onVitalsFieldSubmit(value: number) {
  const field = activeVitalsField.value
  if (!field || props.vitalsDisabled || props.pending) {
    return
  }
  emit('vitalsSubmit', { [field]: value })
}

const hasActions = computed(() =>
  props.choices.length
  || props.showConfirm
  || props.showUpload
  || props.showCheckup
  || props.showWantMoreTests
  || props.showSubmitReview
  || props.showViewRecommend
  || props.showRetry
  || activeVitalsFields.value.length > 0
)
</script>

<template>
  <div
    v-if="hasActions"
    class="turn-actions"
    data-testid="chat-turn-actions"
  >
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
    <AskVitalsCard
      v-if="activeVitalsField"
      :key="activeVitalsField"
      :field="activeVitalsField"
      :disabled="vitalsDisabled"
      :pending="pending"
      @submit="onVitalsFieldSubmit"
    />
    <div
      v-if="showSubmitReview || showViewRecommend || showUpload || (showCheckup && checkupUrl) || (showWantMoreTests && wantMoreTestsUrl) || showRetry"
      class="turn-actions-cta"
    >
      <div class="turn-actions-row">
        <AppButton
          v-if="showSubmitReview && flow !== 'standard'"
          data-testid="chat-submit-expert-review"
          @click="emit('submitReview')"
        >
          {{ $t('chat.submitExpertReview') }}
        </AppButton>
        <AppButton
          v-if="showViewRecommend"
          data-testid="chat-view-recommend"
          :data-flow="flow === 'standard' ? 'standard' : undefined"
          @click="emit('recommend')"
        >
          {{ $t('chat.viewRecommend') }}
        </AppButton>
        <AppButton
          v-if="showWantMoreTests && wantMoreTestsUrl"
          :href="wantMoreTestsUrl"
          target="_blank"
          rel="noopener noreferrer"
          variant="outline"
          data-testid="chat-message-want-more-tests"
        >
          {{ $t('labChart.wantMoreTests') }}
        </AppButton>
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
          v-if="showCheckup && checkupUrl"
          :href="checkupUrl"
          target="_blank"
          rel="noopener noreferrer"
          variant="outline"
          data-testid="chat-message-checkup"
        >
          {{ $t('chat.checkupLink') }}
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
      <p
        v-if="showSubmitReview && flow !== 'standard'"
        class="turn-actions-hint"
        data-testid="chat-submit-expert-review-hint"
      >
        {{ $t('chat.submitExpertReviewHint') }}
      </p>
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

.turn-actions-cta {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 0.375rem;
}

.turn-actions-hint {
  margin: 0;
  font-size: 0.75rem;
  line-height: 1.4;
  color: var(--ui-text-muted);
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

.turn-actions :deep(.ask-vitals-confirm.app-btn) {
  height: 2.25rem;
  min-height: 2.25rem;
}
</style>
