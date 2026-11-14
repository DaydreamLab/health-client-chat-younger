/**
 * Read iat/exp from a JWT payload without verifying the signature.
 * Only used after /users/me already proved the token is accepted by core.
 */
export function readJwtTimes(token: string): {
  issuedAt: number
  expiresAt: number
} | null {
  const parts = token.split('.')
  if (parts.length < 2 || !parts[1]) {
    return null
  }

  try {
    const b64 = parts[1].replace(/-/g, '+').replace(/_/g, '/')
    const padded = b64 + '='.repeat((4 - (b64.length % 4)) % 4)
    const json = JSON.parse(atob(padded)) as { iat?: unknown, exp?: unknown }
    if (typeof json.iat !== 'number' || typeof json.exp !== 'number') {
      return null
    }
    return {
      issuedAt: json.iat * 1000,
      expiresAt: json.exp * 1000
    }
  } catch {
    return null
  }
}
