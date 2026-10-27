<script setup lang="ts">
import type { VitalsField } from '~/utils/reply-actions'
import {
  agePickerValues,
  appendVitalsDigit,
  backspaceVitalsDigits,
  canConfirmVitals,
  parseVitalsDigits,
  vitalsInputStatus,
  VITALS_FIELD_RANGE
} from '~/utils/vitals-input'

const props = defineProps<{
  field: VitalsField
  disabled?: boolean
  pending?: boolean
  /** After successful submit — show static summary. */
  submittedValue?: number | null
}>()

const emit = defineEmits<{
  submit: [value: number]
}>()

const { t } = useI18n()

const labelKey: Record<VitalsField, string> = {
  age: 'chat.vitalsAge',
  height: 'chat.vitalsHeight',
  weight: 'chat.vitalsWeight'
}

const unitKey: Record<VitalsField, string> = {
  age: 'chat.vitalsAgeUnit',
  height: 'chat.vitalsHeightUnit',
  weight: 'chat.vitalsWeightUnit'
}

const hintKey: Record<VitalsField, string> = {
  age: 'chat.vitalsAgeHint',
  height: 'chat.vitalsHeightHint',
  weight: 'chat.vitalsWeightHint'
}

const errorKey: Record<VitalsField, string> = {
  age: 'chat.vitalsAgeError',
  height: 'chat.vitalsHeightError',
  weight: 'chat.vitalsWeightError'
}

const raw = ref('')
const ageSelected = ref(VITALS_FIELD_RANGE.age.defaultValue)
const pickerEl = ref<HTMLElement | null>(null)
const ITEM_H = 44

const isAge = computed(() => props.field === 'age')
const ageValues = agePickerValues()

const submitted = computed(() =>
  props.submittedValue != null && Number.isFinite(props.submittedValue)
)

const displayRaw = computed(() => {
  if (isAge.value) {
    return String(ageSelected.value)
  }
  return raw.value
})

const status = computed(() =>
  vitalsInputStatus(props.field, displayRaw.value, {
    pending: props.pending,
    submitted: submitted.value
  })
)

const previewText = computed(() => {
  if (submitted.value) {
    return String(props.submittedValue)
  }
  if (isAge.value) {
    return String(ageSelected.value)
  }
  return raw.value.trim() || '—'
})

const previewEmpty = computed(() =>
  !isAge.value && !submitted.value && !raw.value.trim()
)

const hintText = computed(() => {
  if (status.value === 'pending') {
    return t('chat.vitalsSubmitting')
  }
  if (status.value === 'submitted') {
    return t('chat.vitalsSubmitted', {
      value: props.submittedValue,
      unit: t(unitKey[props.field])
    })
  }
  if (status.value === 'error') {
    const range = VITALS_FIELD_RANGE[props.field]
    return t(errorKey[props.field], { min: range.min, max: range.max })
  }
  return t(hintKey[props.field])
})

const confirmDisabled = computed(() => {
  if (props.disabled || props.pending || submitted.value) {
    return true
  }
  if (isAge.value) {
    return !canConfirmVitals('age', String(ageSelected.value))
  }
  return !canConfirmVitals(props.field, raw.value)
})

const keysLocked = computed(() =>
  Boolean(props.disabled || props.pending || submitted.value)
)

const errorId = computed(() => `ask-vitals-error-${props.field}`)

watch(
  () => props.field,
  () => {
    raw.value = ''
    ageSelected.value = VITALS_FIELD_RANGE.age.defaultValue
    nextTick(() => scrollAgeIntoView(ageSelected.value, false))
  }
)

onMounted(() => {
  if (isAge.value) {
    nextTick(() => scrollAgeIntoView(ageSelected.value, false))
  }
})

function scrollAgeIntoView(value: number, smooth: boolean) {
  const el = pickerEl.value
  if (!el) {
    return
  }
  const idx = value - VITALS_FIELD_RANGE.age.min
  const top = idx * ITEM_H
  el.scrollTo({ top, behavior: smooth ? 'smooth' : 'auto' })
}

function onPickerScroll() {
  const el = pickerEl.value
  if (!el) {
    return
  }
  const idx = Math.round(el.scrollTop / ITEM_H)
  const clamped = Math.min(
    Math.max(idx, 0),
    VITALS_FIELD_RANGE.age.max - VITALS_FIELD_RANGE.age.min
  )
  ageSelected.value = VITALS_FIELD_RANGE.age.min + clamped
}

let scrollEndTimer: ReturnType<typeof setTimeout> | null = null
function onPickerScrollSnap() {
  onPickerScroll()
  if (scrollEndTimer) {
    clearTimeout(scrollEndTimer)
  }
  scrollEndTimer = setTimeout(() => {
    scrollAgeIntoView(ageSelected.value, true)
  }, 80)
}

function selectAge(value: number) {
  if (keysLocked.value) {
    return
  }
  ageSelected.value = value
  scrollAgeIntoView(value, true)
}

function pressDigit(digit: string) {
  if (keysLocked.value || isAge.value) {
    return
  }
  raw.value = appendVitalsDigit(raw.value, digit)
}

function pressBackspace() {
  if (keysLocked.value || isAge.value) {
    return
  }
  raw.value = backspaceVitalsDigits(raw.value)
}

function onConfirm() {
  if (confirmDisabled.value) {
    return
  }
  const n = isAge.value
    ? ageSelected.value
    : parseVitalsDigits(raw.value)
  if (n === null || !canConfirmVitals(props.field, String(n))) {
    return
  }
  emit('submit', n)
}
</script>

<template>
  <div
    v-if="submitted"
    class="ask-vitals-card is-submitted"
    data-testid="chat-vitals-card"
    :data-vitals-field="field"
    data-vitals-status="submitted"
    role="status"
  >
    {{ $t('chat.vitalsSubmitted', {
      value: submittedValue,
      unit: $t(unitKey[field])
    }) }}
  </div>
  <div
    v-else
    class="ask-vitals-card"
    :class="{
      'is-error': status === 'error',
      'is-pending': status === 'pending'
    }"
    data-testid="chat-vitals-card"
    :data-vitals-field="field"
    :data-vitals-status="status"
  >
    <div class="ask-vitals-head">
      <span class="ask-vitals-label">{{ $t(labelKey[field]) }}</span>
      <span class="ask-vitals-unit">{{ $t(unitKey[field]) }}</span>
    </div>

    <div
      class="ask-vitals-preview"
      :class="{ empty: previewEmpty }"
      aria-live="polite"
      :data-testid="`chat-vitals-${field}`"
    >
      {{ previewText }}
    </div>

    <p
      :id="errorId"
      class="ask-vitals-hint"
      :class="{ error: status === 'error' }"
      role="status"
    >
      {{ hintText }}
    </p>

    <!-- Age list / drum picker -->
    <div
      v-if="isAge"
      class="ask-vitals-picker"
      data-testid="chat-vitals-age-picker"
    >
      <div
        class="ask-vitals-picker-fade ask-vitals-picker-fade-t"
        aria-hidden="true"
      />
      <div
        class="ask-vitals-picker-sel"
        aria-hidden="true"
      />
      <div
        class="ask-vitals-picker-fade ask-vitals-picker-fade-b"
        aria-hidden="true"
      />
      <div
        ref="pickerEl"
        class="ask-vitals-picker-list"
        role="listbox"
        :aria-label="$t(labelKey.age)"
        :aria-activedescendant="`ask-vitals-age-${ageSelected}`"
        :aria-disabled="keysLocked ? 'true' : undefined"
        tabindex="0"
        @scroll.passive="onPickerScrollSnap"
      >
        <button
          v-for="value in ageValues"
          :id="`ask-vitals-age-${value}`"
          :key="value"
          type="button"
          class="ask-vitals-picker-item"
          :class="{ active: value === ageSelected }"
          role="option"
          :aria-selected="value === ageSelected"
          :disabled="keysLocked"
          :data-testid="`chat-vitals-age-option-${value}`"
          @click="selectAge(value)"
        >
          {{ value }}
        </button>
      </div>
    </div>

    <!-- Height / weight integer numpad (· disabled) -->
    <div
      v-else
      class="ask-vitals-numpad"
      data-testid="chat-vitals-numpad"
      role="group"
      :aria-label="$t(labelKey[field])"
      :aria-describedby="status === 'error' ? errorId : undefined"
    >
      <button
        v-for="digit in ['1', '2', '3', '4', '5', '6', '7', '8', '9']"
        :key="digit"
        type="button"
        class="ask-vitals-key"
        :disabled="keysLocked"
        :data-testid="`chat-vitals-key-${digit}`"
        @click="pressDigit(digit)"
      >
        {{ digit }}
      </button>
      <button
        type="button"
        class="ask-vitals-key ghost"
        disabled
        aria-hidden="true"
        tabindex="-1"
        data-testid="chat-vitals-key-dot"
      >
        ·
      </button>
      <button
        type="button"
        class="ask-vitals-key"
        :disabled="keysLocked"
        data-testid="chat-vitals-key-0"
        @click="pressDigit('0')"
      >
        0
      </button>
      <button
        type="button"
        class="ask-vitals-key ghost"
        :disabled="keysLocked"
        :aria-label="$t('chat.vitalsBackspace')"
        data-testid="chat-vitals-key-backspace"
        @click="pressBackspace"
      >
        ⌫
      </button>
    </div>

    <div class="ask-vitals-actions">
      <AppButton
        type="button"
        class="ask-vitals-confirm"
        data-testid="chat-vitals-confirm"
        :disabled="confirmDisabled"
        :aria-busy="pending ? 'true' : undefined"
        @click="onConfirm"
      >
        {{ pending ? $t('chat.vitalsConfirmPending') : $t('chat.vitalsConfirm') }}
      </AppButton>
    </div>
  </div>
</template>

<style scoped>
.ask-vitals-card {
  width: 100%;
  max-width: 20rem;
  margin-top: 0.25rem;
  padding: 0.875rem;
  border: 1px solid var(--ui-border);
  border-radius: 0.875rem;
  background: var(--ui-bg-elevated);
  box-shadow: 0 4px 16px color-mix(in oklab, var(--color-mist-600) 6%, transparent);
}

.ask-vitals-card.is-error {
  border-color: color-mix(in oklab, var(--color-coral-600) 45%, var(--ui-border));
  background: linear-gradient(
    180deg,
    var(--color-coral-50),
    var(--ui-bg-elevated) 48%
  );
}

.ask-vitals-card.is-pending {
  opacity: 0.72;
  pointer-events: none;
}

.ask-vitals-card.is-submitted {
  max-width: 17.5rem;
  padding: 0.625rem 0.875rem;
  background: var(--color-brand-50);
  border-color: var(--color-brand-100);
  box-shadow: none;
  font-size: 0.8125rem;
  font-weight: 600;
  color: var(--color-brand-700);
}

.ask-vitals-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  margin-bottom: 0.375rem;
}

.ask-vitals-label {
  font-size: 0.8125rem;
  font-weight: 700;
  color: var(--ui-text-highlighted);
}

.ask-vitals-unit {
  font-size: 0.75rem;
  font-weight: 700;
  color: var(--ui-primary);
  background: var(--color-brand-50);
  padding: 0.125rem 0.5rem;
  border-radius: 999px;
}

.ask-vitals-preview {
  min-height: 3.25rem;
  line-height: 3.25rem;
  text-align: center;
  font-size: 2.5rem;
  font-weight: 700;
  letter-spacing: 0.02em;
  font-variant-numeric: tabular-nums;
  color: var(--ui-text-highlighted);
}

.ask-vitals-preview.empty {
  color: var(--ui-text-dimmed);
  font-weight: 500;
  font-size: 1.75rem;
}

.ask-vitals-hint {
  margin: 0.125rem 0 0.75rem;
  font-size: 0.75rem;
  color: var(--ui-text-muted);
  text-align: center;
}

.ask-vitals-hint.error {
  color: var(--color-coral-600);
  font-weight: 600;
}

.ask-vitals-numpad {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 0.5rem;
}

.ask-vitals-key {
  appearance: none;
  min-height: 2.75rem;
  border: 1px solid var(--ui-border);
  border-radius: 0.625rem;
  background: var(--ui-bg);
  color: var(--ui-text-highlighted);
  font-size: 1.125rem;
  font-weight: 650;
  font-variant-numeric: tabular-nums;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
  transition: background-color 120ms ease, border-color 120ms ease;
}

.ask-vitals-key:hover:not(:disabled) {
  background: var(--color-brand-50);
  border-color: var(--color-brand-100);
}

.ask-vitals-key:active:not(:disabled) {
  background: var(--color-brand-100);
}

.ask-vitals-key:focus-visible {
  outline: 2px solid color-mix(in oklab, var(--ui-primary) 45%, transparent);
  outline-offset: 2px;
}

.ask-vitals-key:disabled {
  opacity: 0.35;
  cursor: not-allowed;
}

.ask-vitals-key.ghost {
  color: var(--ui-text-muted);
  font-size: 1rem;
}

.ask-vitals-picker {
  position: relative;
  height: 11.25rem;
  margin: 0.25rem 0 0.5rem;
  overflow: hidden;
  border-radius: 0.75rem;
  background: var(--ui-bg);
  border: 1px solid var(--ui-border);
}

.ask-vitals-picker-fade {
  position: absolute;
  left: 0;
  right: 0;
  height: 3rem;
  z-index: 2;
  pointer-events: none;
}

.ask-vitals-picker-fade-t {
  top: 0;
  background: linear-gradient(180deg, var(--ui-bg), transparent);
}

.ask-vitals-picker-fade-b {
  bottom: 0;
  background: linear-gradient(0deg, var(--ui-bg), transparent);
}

.ask-vitals-picker-sel {
  position: absolute;
  left: 0.5rem;
  right: 0.5rem;
  top: 50%;
  transform: translateY(-50%);
  height: 2.75rem;
  border-radius: 0.625rem;
  border: 1.5px solid var(--ui-primary);
  background: color-mix(in oklab, var(--ui-primary) 8%, #fff);
  z-index: 1;
  pointer-events: none;
}

.ask-vitals-picker-list {
  position: absolute;
  inset: 0;
  overflow-y: auto;
  scroll-snap-type: y mandatory;
  padding: 2.875rem 0;
  text-align: center;
  -webkit-overflow-scrolling: touch;
}

.ask-vitals-picker-item {
  appearance: none;
  display: block;
  width: 100%;
  height: 2.75rem;
  line-height: 2.75rem;
  padding: 0;
  border: 0;
  background: transparent;
  scroll-snap-align: center;
  font-size: 1.125rem;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  color: var(--ui-text-dimmed);
  cursor: pointer;
}

.ask-vitals-picker-item.active {
  color: var(--ui-text-highlighted);
  font-size: 1.375rem;
  font-weight: 750;
}

.ask-vitals-picker-item:disabled {
  cursor: not-allowed;
}

.ask-vitals-actions {
  display: flex;
  justify-content: flex-end;
  margin-top: 0.75rem;
}

.ask-vitals-confirm {
  min-width: 4.5rem;
}

@media (max-width: 640px) {
  .ask-vitals-card {
    max-width: 100%;
  }

  .ask-vitals-key {
    min-height: 3rem;
  }
}
</style>
