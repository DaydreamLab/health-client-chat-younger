/**
 * Build-time public support inbox from `NUXT_PUBLIC_SUPPORT_EMAIL`.
 * Empty / whitespace → do not render the contact line (no fallback address).
 */
export function normalizeSupportEmail(raw: unknown): string {
  if (typeof raw !== 'string') {
    return ''
  }
  return raw.trim()
}

export function supportMailtoHref(email: string): string | null {
  const normalized = normalizeSupportEmail(email)
  return normalized ? `mailto:${normalized}` : null
}

/** Props for the footer/about mailto line, or null when the line must be hidden. */
export function supportEmailLinkModel(raw: unknown): { email: string, href: string } | null {
  const email = normalizeSupportEmail(raw)
  const href = supportMailtoHref(email)
  if (!href) {
    return null
  }
  return { email, href }
}
