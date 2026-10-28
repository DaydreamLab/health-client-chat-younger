/** Refresh at most this often while the session is in use. */
export const SESSION_SLIDE_AFTER_MS = 5 * 60 * 1000

/** Also refresh when the token is about to expire. */
export const SESSION_EXPIRY_SKEW_MS = 60_000

export function shouldSlideSession(input: {
  now: number
  issuedAt: number | null
  expiresAt: number | null
  force?: boolean
}): boolean {
  if (input.force) {
    return true
  }
  if (input.issuedAt == null || input.expiresAt == null) {
    return true
  }
  if (input.expiresAt - input.now <= SESSION_EXPIRY_SKEW_MS) {
    return true
  }
  return input.now - input.issuedAt >= SESSION_SLIDE_AFTER_MS
}
