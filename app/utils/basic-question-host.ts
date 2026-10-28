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
