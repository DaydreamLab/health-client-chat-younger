/**
 * Intake ask display／answer UI — ADR 0037 R8 (decision-driven intake ask).
 *
 * FE decides widgets from `gap_code` + answer UI, not by matching bank prompt text.
 * Backend wire name for answer UI is not finalized; change
 * {@link INTAKE_ASK_ANSWER_UI_WIRE_KEY} only when core settles.
 *
 * Assumed shape (reply_actions action payload / profile_question / next_question):
 * ```json
 * {
 *   "gap_code": "height",
 *   "answer_ui": "number_input"
 * }
 * ```
 * `answer_ui` values: `number_input` | `age_picker` | `chips` | `text_input`
 *
 * Existing `gap_code` on profile_question／choose_option／ask_vitals／next_question is reused.
 * When `answer_ui` is absent, map from legacy `answer_type`／ask_vitals so current RA still
 * enable the gap_code path; when neither gap nor any answer method is present, callers
 * keep the pre-R8 text-matching host behaviour.
 */

/** Provisional wire key — rename here when core finalizes the field. */
export const INTAKE_ASK_ANSWER_UI_WIRE_KEY = 'answer_ui' as const

export type IntakeAskAnswerUi
  = 'number_input'
    | 'age_picker'
    | 'chips'
    | 'text_input'

const ANSWER_UI_VALUES = new Set<string>([
  'number_input',
  'age_picker',
  'chips',
  'text_input'
])

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function normalizeGapCode(gapCode: string | null | undefined): string | null {
  if (typeof gapCode !== 'string') {
    return null
  }
  const trimmed = gapCode.trim().toLowerCase()
  if (!trimmed) {
    return null
  }
  if (trimmed === 'age_years') {
    return 'age'
  }
  return trimmed
}

/** Read provisional `answer_ui` from a payload／meta object. */
export function readIntakeAskAnswerUi(
  source: Record<string, unknown> | null | undefined
): IntakeAskAnswerUi | null {
  if (!source) {
    return null
  }
  const raw = source[INTAKE_ASK_ANSWER_UI_WIRE_KEY]
  if (typeof raw !== 'string') {
    return null
  }
  const value = raw.trim().toLowerCase()
  return ANSWER_UI_VALUES.has(value) ? (value as IntakeAskAnswerUi) : null
}

/**
 * Resolve answer UI from provisional wire field, else legacy answer_type／vitals.
 * Returns null when nothing indicates how the member should answer.
 */
export function resolveIntakeAskAnswerUi(input: {
  source?: Record<string, unknown> | null
  answerType?: string | null
  gapCode?: string | null
  /** True when usable reply_actions include ask_vitals for this turn. */
  hasAskVitals?: boolean
  vitalsField?: string | null
}): IntakeAskAnswerUi | null {
  const fromWire = readIntakeAskAnswerUi(input.source ?? null)
  if (fromWire) {
    return fromWire
  }

  const gap = normalizeGapCode(input.gapCode)
  const field = (input.vitalsField ?? gap)?.trim().toLowerCase() || null
  const answerType = typeof input.answerType === 'string'
    ? input.answerType.trim().toLowerCase()
    : ''

  if (input.hasAskVitals || answerType === 'int') {
    if (field === 'age') {
      return 'age_picker'
    }
    return 'number_input'
  }
  if (answerType === 'text') {
    return 'text_input'
  }
  if (answerType === 'enum' || answerType === 'multi_enum') {
    return 'chips'
  }
  return null
}

/**
 * Decision-driven path when we have a gap_code and a resolvable answer method.
 * Otherwise callers must keep legacy prompt-text hosting.
 */
export function isDecisionDrivenIntakeAsk(input: {
  gapCode?: string | null
  source?: Record<string, unknown> | null
  answerType?: string | null
  hasAskVitals?: boolean
  vitalsField?: string | null
}): boolean {
  const gap = normalizeGapCode(input.gapCode)
  if (!gap) {
    return false
  }
  return resolveIntakeAskAnswerUi(input) !== null
}

/** Pull provisional answer_ui + known fields from a loose meta／payload record. */
export function intakeAskMetaFromUnknown(raw: unknown): {
  gapCode: string | null
  answerType: string | null
  answerUi: IntakeAskAnswerUi | null
  source: Record<string, unknown> | null
} {
  if (!isRecord(raw)) {
    return { gapCode: null, answerType: null, answerUi: null, source: null }
  }
  const gapCode = typeof raw.gap_code === 'string' ? raw.gap_code : null
  const answerType = typeof raw.answer_type === 'string' ? raw.answer_type : null
  return {
    gapCode,
    answerType,
    answerUi: readIntakeAskAnswerUi(raw),
    source: raw
  }
}
