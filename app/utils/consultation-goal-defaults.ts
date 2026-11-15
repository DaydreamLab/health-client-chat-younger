import type { ChatMessageOption } from './first-order'

/** Goal codes mirroring core ConsultationGoal::defaultCatalog(). */
export const DEFAULT_CONSULTATION_GOAL_CODES = [
  'sleep',
  'weight_loss',
  'immune_boost',
  'cognitive_function',
  'gastrointestinal'
] as const

/**
 * Default goal chips when the stream omits options.
 * Pass `labelFor` (e.g. `code => t(\`homeGoals.${code}\`)`) so EN/zh stay localized.
 * Without `labelFor`, labels fall back to the code string (no hardcoded locale copy).
 */
export function defaultConsultationGoalOptions(
  labelFor?: (code: string) => string
): ChatMessageOption[] {
  return DEFAULT_CONSULTATION_GOAL_CODES.map(code => ({
    code,
    label: labelFor?.(code) ?? code
  }))
}
