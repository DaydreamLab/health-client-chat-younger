import { skipHydrate } from 'pinia'
import type { UserBrief, UserMe, UserSession } from '~/utils/candor-api'
import { CandorApiError } from '~/utils/candor-api'
import { readJwtTimes } from '~/utils/jwt-times'
import { shouldSlideSession } from '~/utils/session-slide'

function nameFromEmail(email: string) {
  const local = email.split('@')[0]?.replace(/[._+-]+/g, ' ').trim() ?? ''

  if (!local) {
    return 'User'
  }

  return local.replace(/(^|\s)\S/g, part => part.toUpperCase())
}

function initialsFromName(name: string) {
  const parts = name.split(/\s+/).filter(Boolean)

  if (parts.length >= 2) {
    return `${parts[0]!.slice(0, 1)}${parts[1]!.slice(0, 1)}`.toUpperCase()
  }

  return name.slice(0, 2).toUpperCase() || 'YO'
}

function toBrief(user: UserBrief | UserMe): UserBrief {
  return {
    id: user.id,
    role: user.role,
    email: user.email ?? null,
    display_name: user.display_name ?? null
  }
}

export const useAuthStore = defineStore('auth', () => {
  const api = useCandorApi()
  // Never revive generate-time guest snapshot into the client — token lives in
  // localStorage and must be re-read via ensureSession after mount.
  const user = skipHydrate(ref<UserBrief | null>(null))
  const expiresAt = skipHydrate(ref<number | null>(null))
  const issuedAt = skipHydrate(ref<number | null>(null))
  const ready = skipHydrate(ref(false))
  let ensureInFlight: Promise<void> | null = null
  let refreshInFlight: Promise<void> | null = null

  const hasSession = computed(() => Boolean(api.readToken() && user.value))
  const isMember = computed(() => user.value?.role === 'member')
  const isLoggedIn = computed(() => hasSession.value)

  const displayName = computed(() => {
    if (!user.value) {
      return ''
    }

    if (user.value.display_name) {
      return user.value.display_name
    }

    if (user.value.email) {
      return nameFromEmail(user.value.email)
    }

    return user.value.role === 'guest' ? 'Guest' : 'User'
  })

  const initials = computed(() => initialsFromName(displayName.value))

  function applySession(session: UserSession) {
    api.writeToken(session.token)
    user.value = toBrief(session.user)
    const now = Date.now()
    issuedAt.value = now
    expiresAt.value = now + session.expires_in * 1000
  }

  function applyMe(me: UserMe, token?: string | null) {
    user.value = toBrief(me)
    const raw = token ?? api.readToken()
    if (!raw) {
      return
    }
    // Seed slide timers from JWT claims so cold load does not force refresh.
    if (issuedAt.value == null || expiresAt.value == null) {
      const times = readJwtTimes(raw)
      if (times) {
        issuedAt.value = times.issuedAt
        expiresAt.value = times.expiresAt
      }
    }
  }

  function clearSession() {
    api.writeToken(null)
    user.value = null
    expiresAt.value = null
    issuedAt.value = null
  }

  /** Drop session only when storage still holds the token that failed. */
  function clearSessionIfToken(expectedToken: string) {
    if (api.readToken() === expectedToken) {
      clearSession()
    }
  }

  async function refreshIfNeeded(force = false) {
    const token = api.readToken()
    if (!token) {
      return
    }

    if (!shouldSlideSession({
      now: Date.now(),
      issuedAt: issuedAt.value,
      expiresAt: expiresAt.value,
      force
    })) {
      return
    }

    if (refreshInFlight) {
      await refreshInFlight
      return
    }

    const requestedToken = token
    // Do not clear on refresh 401: /users/me may still accept this JWT
    // (core issues a new token without invalidating the old one; concurrent
    // refresh races or transient 401 must not wipe a verified member).
    refreshInFlight = (async () => {
      try {
        const session = await api.refresh()
        // Login/register may have replaced the token while refresh was in flight.
        if (api.readToken() !== requestedToken) {
          return
        }
        applySession(session)
      } finally {
        refreshInFlight = null
      }
    })()

    await refreshInFlight
  }

  async function ensureSessionBody() {
    /** True when an existing identity was dropped on 401 and we will mint a fresh guest. */
    let clearJourneyBeforeGuest = false

    if (ready.value && hasSession.value) {
      let refreshUnauthorized = false
      try {
        await refreshIfNeeded()
      } catch (error) {
        // Keep the in-memory identity; only /users/me 401 clears the token.
        if (error instanceof CandorApiError && error.statusCode === 401) {
          refreshUnauthorized = true
        }
      }
      if (hasSession.value && api.readToken() && !refreshUnauthorized) {
        return
      }
      // refresh 401 → fall through and re-validate with /users/me
    }

    try {
      let token = api.readToken()
      if (token) {
        try {
          const me = await api.me()
          const current = api.readToken()
          // Login may have swapped the token while /users/me was in flight.
          if (current !== token) {
            if (!current) {
              return
            }
            // Re-read identity for the token that won.
            token = current
            const latest = await api.me()
            if (api.readToken() !== token) {
              return
            }
            applyMe(latest, token)
          } else {
            applyMe(me, token)
          }
          try {
            await refreshIfNeeded()
          } catch {
            // me() already verified this identity — keep it; do not mint guest.
          }
          if (api.readToken() && user.value) {
            return
          }
          // Never mint guest over a concurrent login token.
          if (hasSession.value || api.readToken()) {
            return
          }
        } catch (error) {
          if (error instanceof CandorApiError && error.statusCode === 401) {
            clearSessionIfToken(token)
            clearJourneyBeforeGuest = !api.readToken()
          } else {
            // Keep token and journey on transient failures; retry later.
            return
          }
        }
      }

      // Login may have written a full session while we were deciding to mint guest.
      if (hasSession.value) {
        return
      }

      // Token without in-memory user (e.g. login during bootstrap): hydrate once more.
      const leftover = api.readToken()
      if (leftover) {
        try {
          const me = await api.me()
          if (api.readToken() !== leftover) {
            return
          }
          applyMe(me, leftover)
          if (hasSession.value) {
            return
          }
        } catch (error) {
          if (error instanceof CandorApiError && error.statusCode === 401) {
            clearSessionIfToken(leftover)
            clearJourneyBeforeGuest = !api.readToken()
          } else {
            return
          }
        }
      }

      // Final guard: never mint guest over an existing token (member refresh /
      // direct open of prerendered /app). Only clear+guest on confirmed 401.
      if (hasSession.value || api.readToken()) {
        return
      }

      if (clearJourneyBeforeGuest) {
        useJourneyStore().clearSession()
      }
      const beforeGuest = api.readToken()
      if (beforeGuest) {
        return
      }
      try {
        const session = await api.guest()
        // Discard if login wrote a member token while guest mint was in flight.
        if (api.readToken() !== beforeGuest) {
          return
        }
        applySession(session)
      } catch {
        // Core down: stay anonymous. Plugin/middleware must not 500 the page.
      }
    } finally {
      ready.value = true
    }
  }

  async function ensureSession() {
    if (ensureInFlight) {
      await ensureInFlight
      return
    }

    ensureInFlight = (async () => {
      try {
        await ensureSessionBody()
      } finally {
        ensureInFlight = null
      }
    })()

    await ensureInFlight
  }

  async function login(email: string, password: string) {
    applySession(await api.login({ email, password }))
  }

  async function register(email: string, password: string, displayNameValue?: string) {
    applySession(await api.register({
      email,
      password,
      display_name: displayNameValue
    }))
  }

  function logout() {
    clearSession()
  }

  async function slideIfActive() {
    if (!api.readToken()) {
      return
    }
    try {
      await refreshIfNeeded()
    } catch {
      // Refresh failure alone must not drop a still-valid token; me() clears on 401.
    }
  }

  return {
    user,
    expiresAt,
    issuedAt,
    ready,
    hasSession,
    isMember,
    isLoggedIn,
    displayName,
    initials,
    ensureSession,
    refreshIfNeeded,
    slideIfActive,
    login,
    register,
    logout,
    clearSession,
    applySession,
    applyMe
  }
})
