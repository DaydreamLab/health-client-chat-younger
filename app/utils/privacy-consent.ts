import { PRIVACY_CONSENT_VERSION_KEY } from './candor-api'

function canUseLocalStorage(): boolean {
  try {
    return typeof localStorage !== 'undefined'
  } catch {
    return false
  }
}

/** Read the privacy-policy version the user last accepted (browser only). */
export function readConsentedPrivacyVersion(): string | null {
  if (!canUseLocalStorage()) {
    return null
  }

  try {
    const value = localStorage.getItem(PRIVACY_CONSENT_VERSION_KEY)
    return value && value.trim() ? value.trim() : null
  } catch {
    return null
  }
}

/** Persist acceptance for a specific privacy-policy `version`. */
export function writeConsentedPrivacyVersion(version: string): void {
  if (!canUseLocalStorage()) {
    return
  }

  const trimmed = version.trim()
  if (!trimmed) {
    return
  }

  try {
    localStorage.setItem(PRIVACY_CONSENT_VERSION_KEY, trimmed)
  } catch {
    // Storage blocked — consent stays session-only via caller state.
  }
}

/**
 * Whether the cookie-consent banner should show for the given policy version.
 * Re-prompt when there is no stored version or it differs from the live policy.
 */
export function needsPrivacyConsent(
  currentVersion: string | null | undefined,
  consentedVersion: string | null
): boolean {
  const current = currentVersion?.trim()
  if (!current) {
    return false
  }

  return consentedVersion !== current
}
