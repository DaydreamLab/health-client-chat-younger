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
  /** ask_vitals fields from reply_actions. */
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
  vitalsSubmit: [values: Partial<Record<VitalsField, number>>]
}>()

const vitalsValues = reactive<Record<VitalsField, string>>({
  age: '',
  height: '',
  weight: ''
})

const vitalsFieldMeta: Record<VitalsField, {
  labelKey: string
  unitKey: string
  inputMode: 'numeric' | 'decimal'
}> = {
  age: { labelKey: 'chat.vitalsAge', unitKey: 'chat.vitalsAgeUnit', inputMode: 'numeric' },
  height: { labelKey: 'chat.vitalsHeight', unitKey: 'chat.vitalsHeightUnit', inputMode: 'decimal' },
  weight: { labelKey: 'chat.vitalsWeight', unitKey: 'chat.vitalsWeightUnit', inputMode: 'decimal' }
}

const activeVitalsFields = computed(() => props.vitalsFields ?? [])

const vitalsConfirmDisabled = computed(() => {
  if (props.vitalsDisabled || props.pending) {
    return true
  }
  return activeVitalsFields.value.some((field) => {
    const raw = vitalsValues[field].trim()
    if (!raw) {
      return true
    }
    const n = Number(raw)
    return !Number.isFinite(n) || n <= 0
  })
})

watch(
  () => activeVitalsFields.value.join(','),
  () => {
    vitalsValues.age = ''
    vitalsValues.height = ''
    vitalsValues.weight = ''
  }
)

function submitVitals() {
  if (vitalsConfirmDisabled.value) {
    return
  }
  const values: Partial<Record<VitalsField, number>> = {}
  for (const field of activeVitalsFields.value) {
    values[field] = Number(vitalsValues[field].trim())
  }
  emit('vitalsSubmit', values)
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
    <div
      v-if="activeVitalsFields.length"
      class="turn-actions-vitals"
      data-testid="chat-vitals-card"
    >
      <div
        v-for="field in activeVitalsFields"
        :key="field"
        class="turn-actions-vitals-field"
      >
        <label
          class="turn-actions-vitals-label"
          :for="`chat-vitals-${field}`"
        >
          {{ $t(vitalsFieldMeta[field].labelKey) }}
        </label>
        <div class="turn-actions-vitals-input-wrap">
          <input
            :id="`chat-vitals-${field}`"
            v-model="vitalsValues[field]"
            class="turn-actions-vitals-input"
            type="number"
            :inputmode="vitalsFieldMeta[field].inputMode"
            min="1"
            step="any"
            :disabled="pending || vitalsDisabled"
            :data-testid="`chat-vitals-${field}`"
            @keydown.enter.prevent="submitVitals"
          >
          <span class="turn-actions-vitals-unit">{{ $t(vitalsFieldMeta[field].unitKey) }}</span>
        </div>
      </div>
      <AppButton
        type="button"
        data-testid="chat-vitals-confirm"
        :disabled="vitalsConfirmDisabled"
        @click="submitVitals"
      >
        {{ $t('chat.vitalsConfirm') }}
      </AppButton>
    </div>
    <div
      v-if="showSubmitReview || showViewRecommend || showUpload || (showCheckup && checkupUrl) || (showWantMoreTests && wantMoreTestsUrl) || showRetry"
      class="turn-actions-row"
    >
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

.turn-actions-vitals {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  padding: 0.75rem;
  border: 1px solid var(--ui-border);
  border-radius: 0.75rem;
  background: var(--ui-bg-elevated);
}

.turn-actions-vitals-field {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.turn-actions-vitals-label {
  font-size: 0.75rem;
  color: var(--ui-text-muted);
}

.turn-actions-vitals-input-wrap {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.turn-actions-vitals-input {
  flex: 1;
  min-width: 0;
  height: 2rem;
  padding-inline: 0.75rem;
  border: 1px solid var(--ui-border);
  border-radius: 0.5rem;
  background: var(--ui-bg);
  color: var(--ui-text-highlighted);
  font-size: 0.875rem;
}

.turn-actions-vitals-input:focus {
  outline: none;
  border-color: color-mix(in oklab, var(--ui-primary) 40%, var(--ui-border));
  box-shadow: 0 0 0 3px color-mix(in oklab, var(--ui-primary) 20%, transparent);
}

.turn-actions-vitals-unit {
  flex-shrink: 0;
  font-size: 0.75rem;
  color: var(--ui-text-muted);
}

.turn-actions :deep(.app-btn) {
  height: 2rem;
  min-height: 2rem;
  padding-inline: 0.75rem;
  font-size: 0.8125rem;
}
</style>
