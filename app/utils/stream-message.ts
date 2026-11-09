/**
 * JSON body for POST /conversation/{id}/messages[/stream]
 * (candor-core draft #134). `intent` is a sibling of `content`.
 * Core whitelists known intents; unknown values are ignored.
 */
export function buildStreamRequestBody(
  content: string,
  intent?: string | null
): { content: string, intent?: string } {
  if (intent) {
    return { content, intent }
  }
  return { content }
}

/**
 * askInterpret() copy: empty／missing goals → no-goals key; otherwise keep
 * the goals-aware original. Source in ChatPanel: journey.clarifyingGoals.
 */
export function resolveAskInterpretI18nKey(
  goals: readonly string[] | null | undefined
): 'chat.askInterpret' | 'chat.askInterpretNoGoals' {
  return Array.isArray(goals) && goals.length > 0
    ? 'chat.askInterpret'
    : 'chat.askInterpretNoGoals'
}

/**
 * After POST /profile/answers succeeds, the echoed option label follow-up
 * stream uses this intent so core skips questionnaire inference
 * (e.g.「無」must not fill other gaps). Value must match core whitelist.
 * Free-typed composer, path_switch, goals, and interpret leave intent unset／as-is.
 */
export const STREAM_INTENT_AFTER_ANSWER = 'after_answer' as const
