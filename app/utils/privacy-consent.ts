import { PRIVACY_CONSENT_VERSION_KEY } from './candor-api'

function canUseLocalStorage(): boolean {
  try {
    return typeof localStorage !== 'undefined'
  } catch {
    return false
  }
}

/**
 * Normalize a privacy-policy `version` for compare / localStorage.
 * core may return an integer (`1`); storage always holds a string (`'1'`).
 */
export function normalizePrivacyVersion(
  version: string | number | null | undefined
): string | null {
  if (version == null) {
    return null
  }

  const normalized = String(version).trim()
  return normalized || null
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
export function writeConsentedPrivacyVersion(version: string | number): void {
  if (!canUseLocalStorage()) {
    return
  }

  const trimmed = normalizePrivacyVersion(version)
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
 * Stored `'1'` matches API number `1` after normalization.
 */
export function needsPrivacyConsent(
  currentVersion: string | number | null | undefined,
  consentedVersion: string | null
): boolean {
  const current = normalizePrivacyVersion(currentVersion)
  if (!current) {
    return false
  }

  return consentedVersion !== current
}
