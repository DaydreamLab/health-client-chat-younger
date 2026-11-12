/**
 * Direct upload appends a user turn after the assistant bubble that invited
 * the upload. The next basic question (height, etc.) has to follow that turn.
 * Splicing the prompt back onto the earlier bubble cuts the question off
 * above the upload.
 */
export function basicQuestionFollowsUserTurn(lastMessageRole: string | undefined): boolean {
  return lastMessageRole === 'user'
}

/**
 * Remove a basic-question prompt that was appended onto other copy.
 * Returns null when there is nothing to peel (prompt absent, or it is the
 * whole bubble and should stay put).
 *
 * Legacy path only — decision-driven intake ask (ADR 0037 R8) hosts by
 * gap_code and must not match bank prompt text.
 */
export function peelAppendedPrompt(existing: string, prompt: string): string | null {
  const trimmedPrompt = prompt.trim()
  if (trimmedPrompt === '') {
    return null
  }
  const trimmedExisting = existing.trim()
  if (!trimmedExisting.includes(trimmedPrompt)) {
    return null
  }
  const peeled = trimmedExisting
    .replace(trimmedPrompt, '')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
  if (peeled === '' || peeled === trimmedExisting) {
    return null
  }
  return peeled
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

export type BasicQuestionHostAction
  = { kind: 'reuse' }
    | { kind: 'append', text: string }
    /** Legacy only: peel bank prompt off last assistant, then append a new bubble. */
    | { kind: 'peel_then_append', peeledText: string, appendText: string }

/**
 * Decide where the next basic ask should live.
 *
 * Decision-driven (`decisionDriven`): host by gap_code; never splice bank
 * prompt text onto model copy. After a user turn, always open a new bubble
 * (empty text — FE shows model content only when core already wrote it).
 *
 * Legacy: keep prompt-text peel／includes behaviour for old messages.
 */
export function decideBasicQuestionHost(input: {
  lastMessageRole: string | undefined
  lastAssistantText: string
  lastAssistantGapCode: string | null | undefined
  lastAssistantHasRequiredBasicAsk: boolean
  nextGapCode: string | null | undefined
  nextPrompt: string
  decisionDriven: boolean
}): BasicQuestionHostAction {
  const prompt = input.nextPrompt.trim()
  const existing = input.lastAssistantText
  const followsUser = basicQuestionFollowsUserTurn(input.lastMessageRole)

  if (input.decisionDriven) {
    const nextGap = normalizeGapCode(input.nextGapCode)
    const hostGap = normalizeGapCode(input.lastAssistantGapCode)

    if (followsUser) {
      // New turn after upload／answer — do not peel by stem text; open a fresh bubble.
      return { kind: 'append', text: '' }
    }

    if (
      nextGap
      && hostGap
      && nextGap === hostGap
      && input.lastAssistantHasRequiredBasicAsk
    ) {
      return { kind: 'reuse' }
    }

    // Model already wrote prose on the latest assistant bubble — attach UI there.
    if (existing.trim() !== '') {
      return { kind: 'reuse' }
    }

    return { kind: 'reuse' }
  }

  // —— Legacy (no gap_code／answer method): prompt-text hosting ——
  if (followsUser) {
    const peeled = peelAppendedPrompt(existing, prompt)
    if (peeled) {
      return { kind: 'peel_then_append', peeledText: peeled, appendText: prompt }
    }
  }

  if (prompt && existing.trim() === prompt) {
    return { kind: 'reuse' }
  }

  if (prompt && existing.includes(prompt) && input.lastAssistantHasRequiredBasicAsk) {
    return { kind: 'reuse' }
  }

  return { kind: 'append', text: prompt }
}

/**
 * Whether bank `next.prompt` should be written into the host bubble.
 * Decision-driven: never — only show model-written ask copy.
 * Legacy: append when the stem is not already present.
 */
export function shouldWriteBankPromptToHost(input: {
  decisionDriven: boolean
  existingText: string
  prompt: string
}): boolean {
  if (input.decisionDriven) {
    return false
  }
  const prompt = input.prompt.trim()
  if (!prompt) {
    return false
  }
  return !input.existingText.includes(prompt)
}
