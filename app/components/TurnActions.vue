<script setup lang="ts">
import type { GreetingOption } from '~/utils/candor-api'
import {
  isCtaControlInteractive,
  resolveConfirmControlStatus,
  resolveOptionControlStatus
} from '~/utils/cta-interaction'
import {
  shouldShowContinueConsultCta,
  type CtaControlStatus,
  type ReplyActionsRoundStatus,
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
  vitalsStatus?: CtaControlStatus | null
  vitalsHasStoredValue?: boolean
  vitalsStoredValue?: number | null
  confirmStatus?: CtaControlStatus | null
  roundStatus?: ReplyActionsRoundStatus | null
  /**
   * Composer has draft text — design B: current round CTAs all grey while typing.
   * Only meaningful when round is current／live.
   */
  composerTyping?: boolean
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

const forceDisabled = computed(() =>
  Boolean(props.composerTyping && props.roundStatus !== 'historical')
)

const activeVitalsFields = computed(() => props.vitalsFields ?? [])

/** One card at a time: always the head of the remaining fields queue. */
const activeVitalsField = computed<VitalsField | null>(() =>
  activeVitalsFields.value[0] ?? null
)

const resolvedVitalsStatus = computed(() =>
  resolveOptionControlStatus(
    props.vitalsStatus,
    props.roundStatus,
    { forceDisabled: forceDisabled.value }
  )
)

const resolvedConfirmStatus = computed(() =>
  resolveConfirmControlStatus(
    props.confirmStatus,
    props.roundStatus,
    { forceDisabled: forceDisabled.value }
  )
)

function optionStatus(option: GreetingOption): CtaControlStatus {
  return resolveOptionControlStatus(
    option.status,
    props.roundStatus,
    { forceDisabled: forceDisabled.value }
  )
}

function optionSelected(option: GreetingOption): boolean {
  const status = optionStatus(option)
  if (status === 'selected') {
    return true
  }
  if (status === 'disabled') {
    return false
  }
  return props.selectedCodes.includes(option.code)
}

function optionDisabled(option: GreetingOption): boolean {
  return props.pending || !isCtaControlInteractive(optionStatus(option))
}

function chipClass(option: GreetingOption): Record<string, boolean> {
  const status = optionStatus(option)
  const selected = optionSelected(option)
  return {
    'is-selected': status === 'selected' || (status === 'current' && selected),
    'is-disabled': status === 'disabled' || (status === 'current' && forceDisabled.value),
    'is-current': status === 'current' && !selected && !forceDisabled.value
  }
}

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

const confirmLocked = computed(() =>
  props.confirmDisabled
  || props.pending
  || !isCtaControlInteractive(resolvedConfirmStatus.value)
)

const confirmToneClass = computed(() => {
  if (resolvedConfirmStatus.value === 'selected') {
    return 'turn-confirm-btn is-selected'
  }
  if (resolvedConfirmStatus.value === 'disabled'
    || (resolvedConfirmStatus.value === 'current' && forceDisabled.value)) {
    return 'turn-confirm-btn is-disabled-tone'
  }
  return 'turn-confirm-btn is-brand'
})

const secondaryCtaLocked = computed(() =>
  props.pending || forceDisabled.value || props.roundStatus === 'historical'
)

const secondaryToneClass = computed(() =>
  secondaryCtaLocked.value ? 'is-disabled-tone' : ''
)

const primaryToneClass = computed(() =>
  secondaryCtaLocked.value ? 'turn-primary-cta is-disabled-tone' : 'turn-primary-cta'
)

function onVitalsFieldSubmit(value: number) {
  const field = activeVitalsField.value
  if (!field || props.vitalsDisabled || props.pending) {
    return
  }
  if (!isCtaControlInteractive(resolvedVitalsStatus.value)) {
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
    :data-round-status="roundStatus ?? undefined"
    :data-composer-typing="forceDisabled ? 'true' : undefined"
  >
    <div
      v-if="choices.length"
      class="turn-actions-chips"
      data-testid="chat-quiz-options"
    >
      <button
        v-for="option in choices"
        :key="option.code"
        type="button"
        class="app-chip turn-chip"
        :class="chipClass(option)"
        :data-testid="`chat-quiz-option-${option.code}`"
        :data-cta-status="optionStatus(option)"
        :disabled="optionDisabled(option)"
        @click="emit('choice', option)"
      >
        {{ option.label }}
      </button>
      <AppButton
        v-if="continueConsultInChipRow"
        variant="outline"
        :class="`turn-chip-continue ${secondaryToneClass}`"
        data-testid="chat-continue-consult"
        :disabled="pending || secondaryCtaLocked"
        @click="emit('continueConsult')"
      >
        {{ $t('chat.continueConsult') }}
      </AppButton>
    </div>
    <div
      v-if="showConfirm"
      class="turn-actions-confirm"
    >
      <AppButton
        type="button"
        :class="confirmToneClass"
        data-testid="chat-quiz-confirm"
        :data-cta-status="resolvedConfirmStatus"
        :disabled="confirmLocked"
        @click="emit('confirm')"
      >
        {{ $t('chat.confirmSelection') }}
      </AppButton>
    </div>
    <AskVitalsCard
      v-if="activeVitalsField"
      :key="`${activeVitalsField}-${resolvedVitalsStatus}-${vitalsStoredValue ?? ''}`"
      :field="activeVitalsField"
      :disabled="vitalsDisabled || !isCtaControlInteractive(resolvedVitalsStatus)"
      :pending="pending"
      :control-status="resolvedVitalsStatus"
      :has-stored-value="vitalsHasStoredValue"
      :stored-value="vitalsStoredValue"
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
          :class="primaryToneClass"
          data-testid="chat-expert-booking"
          :disabled="secondaryCtaLocked"
          @click="emit('expertBooking')"
        >
          {{ expertBookingButtonLabel }}
        </AppButton>
        <AppButton
          v-if="showViewRecommend"
          :class="primaryToneClass"
          data-testid="chat-view-recommend"
          :data-flow="flow === 'standard' ? 'standard' : undefined"
          :disabled="secondaryCtaLocked"
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
          :class="`turn-secondary-cta ${uploadDisabled || secondaryCtaLocked ? 'is-disabled-tone' : ''}`"
          data-testid="chat-message-upload"
          :disabled="uploadDisabled || secondaryCtaLocked"
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
          :class="`turn-secondary-cta ${secondaryToneClass}`"
          data-testid="chat-message-checkup"
        >
          {{ $t('chat.checkupLink') }}
        </AppButton>
        <AppButton
          v-if="continueConsultInCtaRow"
          variant="outline"
          :class="`turn-secondary-cta ${secondaryToneClass}`"
          data-testid="chat-continue-consult"
          :disabled="pending || secondaryCtaLocked"
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
          :class="`turn-secondary-cta ${secondaryToneClass}`"
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
  width: 100%;
}

/* Design B: two equal columns; confirm／vitals share the same width. */
.turn-actions-chips {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.5rem;
  width: 100%;
  align-items: stretch;
}

.turn-chip {
  width: 100%;
  text-align: center;
  border-color: var(--color-mist-500);
  background-color: #fff;
  color: var(--color-mist-600);
}

.turn-chip.is-current:hover:not(:disabled) {
  background-color: var(--color-brand-50);
  border-color: var(--color-brand-700);
}

.turn-chip.is-selected {
  background-color: var(--color-brand-50);
  border: 1.5px solid var(--color-brand-700);
  color: var(--color-brand-700);
  font-weight: 600;
}

.turn-chip.is-disabled,
.turn-chip:disabled.is-disabled {
  background-color: var(--color-mist-100);
  border: 1px solid var(--color-mist-500);
  color: var(--color-mist-600);
  cursor: not-allowed;
  opacity: 1;
}

.turn-chip-continue {
  width: 100%;
  grid-column: 1 / -1;
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
  width: 100%;
}

.turn-confirm-btn,
.turn-primary-cta {
  width: 100%;
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

/* Selected／grey tones without opacity fade (design B). */
.turn-actions :deep(.turn-confirm-btn.is-brand.app-btn-primary),
.turn-actions :deep(.turn-primary-cta:not(.is-disabled-tone).app-btn-primary) {
  background-color: var(--color-brand-600);
  color: #fff;
  border: 1px solid transparent;
  opacity: 1;
}

.turn-actions :deep(.turn-confirm-btn.is-selected),
.turn-actions :deep(.is-selected.app-btn) {
  background-color: var(--color-brand-50) !important;
  color: var(--color-brand-700) !important;
  border: 1.5px solid var(--color-brand-700) !important;
  opacity: 1 !important;
}

.turn-actions :deep(.turn-confirm-btn.is-disabled-tone),
.turn-actions :deep(.is-disabled-tone.app-btn),
.turn-actions :deep(.turn-confirm-btn.is-disabled-tone:disabled),
.turn-actions :deep(.is-disabled-tone.app-btn:disabled) {
  background-color: var(--color-mist-100) !important;
  color: var(--color-mist-600) !important;
  border: 1px solid var(--color-mist-500) !important;
  opacity: 1 !important;
  cursor: not-allowed;
}
</style>
