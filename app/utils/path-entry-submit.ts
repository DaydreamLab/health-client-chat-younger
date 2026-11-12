/**
 * Composer submit while path entry chips are pending.
 *
 * Core treats unset path as A (candor-core docs/spec/16-http-api.md). Free-text
 * submit must not silently drop — plan as implicit path A, then send the text
 * via the same entry flow as chip「我想聊聊」.
 */

export type PathEntrySubmitPlan
  = | { type: 'ignore' }
    | { type: 'send', content: string }
    | { type: 'implicit_path_a', content: string }

export function planPathEntrySubmit(input: {
  content: string
  pending: boolean
  readonly?: boolean
  escalated?: boolean
  pathEntryPending: boolean
}): PathEntrySubmitPlan {
  const content = input.content.trim()
  if (!content || input.pending || input.readonly || input.escalated) {
    return { type: 'ignore' }
  }
  if (input.pathEntryPending) {
    return { type: 'implicit_path_a', content }
  }
  return { type: 'send', content }
}

/** Clear the composer only when submit will actually proceed. */
export function shouldClearComposerOnSubmit(plan: PathEntrySubmitPlan): boolean {
  return plan.type !== 'ignore'
}
