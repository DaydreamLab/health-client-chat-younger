<script setup lang="ts">
import type { GreetingOption } from '~/utils/candor-api'
import {
  shouldShowContinueConsultCta,
  type VitalsField
} from '~/utils/reply-actions'

const props = defineProps<{
  choices: GreetingOption[]
  selectedCodes: string[]
  showConfirm: boolean
  confirmDisabled: boolean
  showUpload: boolean
  uploadDisabled: boolean
  showCheckup: boolean
  checkupUrl: string
  showFullTest: boolean
  fullTestUrl: string
  /** Backend label; empty → i18n chat.offerFullTest. */
  fullTestLabel?: string | null
  /** Backend copy; empty → i18n with markerCount. */
  fullTestCopy?: string | null
  fullTestMarkerCount?: number | null
  showExpertBooking: boolean
  /** Backend label; empty → i18n chat.expertBooking. */
  expertBookingLabel?: string | null
  showWantMoreTests: boolean
  wantMoreTestsUrl: string
  showViewRecommend: boolean
  showRetry: boolean
  /** Backend／caller label; empty → i18n chat.reportRetry. */
  retryLabel?: string | null
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
  recommend: []
  expertBooking: []
  retry: []
  /** FE-appended checkup CTA: stream continue-health copy as a normal user message. */
  continueConsult: []
  /** One field per confirm (multi-field = sequential cards). */
  vitalsSubmit: [values: Partial<Record<VitalsField, number>>]
}>()

const { t } = useI18n()

const activeVitalsFields = computed(() => props.vitalsFields ?? [])

/** One card at a time: always the head of the remaining fields queue. */
const activeVitalsField = computed<VitalsField | null>(() =>
  activeVitalsFields.value[0] ?? null
)

/** Fixed FE CTA when checkup suggestion UI is on (lab_followup chips and/or upload+checkup). */
const showContinueConsult = computed(() =>
  shouldShowContinueConsultCta({
    showUpload: props.showUpload,
    showCheckup: props.showCheckup,
    choices: props.choices
  })
)

/** lab_followup chips share a row with continue; upload+checkup-only keeps continue in CTA row. */
const continueConsultInChipRow = computed(
  () => showContinueConsult.value && props.choices.length > 0
)
const continueConsultInCtaRow = computed(
  () => showContinueConsult.value && props.choices.length === 0
)

const showFullTestLink = computed(
  () => props.showFullTest && props.fullTestUrl.trim() !== ''
)

const showExpertBookingCta = computed(() => props.showExpertBooking)

const retryButtonLabel = computed(() => {
  const fromCaller = String(props.retryLabel ?? '').trim()
  return fromCaller || t('chat.reportRetry')
})

const expertBookingButtonLabel = computed(() => {
  const fromPayload = String(props.expertBookingLabel ?? '').trim()
  return fromPayload || t('chat.expertBooking')
})

const fullTestButtonLabel = computed(() => {
  const fromPayload = String(props.fullTestLabel ?? '').trim()
  return fromPayload || t('chat.offerFullTest')
})

const fullTestHint = computed(() => {
  const fromPayload = String(props.fullTestCopy ?? '').trim()
  if (fromPayload) {
    return fromPayload
  }
  const n = props.fullTestMarkerCount
  if (n === null || n === undefined || !Number.isFinite(n)) {
    return ''
  }
  return t('chat.offerFullTestCopy', { n: Math.floor(n) })
})

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
  || showFullTestLink.value
  || showExpertBookingCta.value
  || props.showWantMoreTests
  || props.showViewRecommend
  || props.showRetry
  || showContinueConsult.value
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
      <AppButton
        v-if="continueConsultInChipRow"
        variant="outline"
        data-testid="chat-continue-consult"
        :disabled="pending"
        @click="emit('continueConsult')"
      >
        {{ $t('chat.continueConsult') }}
      </AppButton>
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
      v-if="showViewRecommend || showExpertBookingCta || showUpload || (showCheckup && checkupUrl) || showFullTestLink || (showWantMoreTests && wantMoreTestsUrl) || showRetry || continueConsultInCtaRow"
      class="turn-actions-cta"
    >
      <p
        v-if="showFullTestLink && fullTestHint"
        class="turn-actions-hint"
        data-testid="chat-message-full-test-hint"
      >
        {{ fullTestHint }}
      </p>
      <div class="turn-actions-row">
        <AppButton
          v-if="showExpertBookingCta"
          data-testid="chat-expert-booking"
          @click="emit('expertBooking')"
        >
          {{ expertBookingButtonLabel }}
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
          v-if="continueConsultInCtaRow"
          variant="outline"
          data-testid="chat-continue-consult"
          :disabled="pending"
          @click="emit('continueConsult')"
        >
          {{ $t('chat.continueConsult') }}
        </AppButton>
        <AppButton
          v-if="showRetry"
          variant="outline"
          data-testid="chat-report-retry"
          :disabled="pending"
          @click="emit('retry')"
        >
          {{ retryButtonLabel }}
        </AppButton>
        <!-- 建議按鈕排在原本按鈕（舊報告三顆、完成、checkup 等）後面 -->
        <AppButton
          v-if="showFullTestLink"
          :href="fullTestUrl"
          target="_blank"
          rel="noopener noreferrer"
          variant="outline"
          data-testid="chat-message-full-test"
        >
          {{ fullTestButtonLabel }}
        </AppButton>
      </div>
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
