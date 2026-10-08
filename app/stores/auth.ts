import type { UserBrief, UserMe, UserSession } from '~/utils/candor-api'
import { CandorApiError } from '~/utils/candor-api'

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
  const user = ref<UserBrief | null>(null)
  const expiresAt = ref<number | null>(null)
  const ready = ref(false)
  const bootstrapping = ref(false)
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
    expiresAt.value = Date.now() + session.expires_in * 1000
  }

  function applyMe(me: UserMe) {
    user.value = toBrief(me)
  }

  function clearSession() {
    api.writeToken(null)
    user.value = null
    expiresAt.value = null
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

    const skewMs = 60_000
    if (!force && expiresAt.value && expiresAt.value - Date.now() > skewMs) {
      return
    }

    if (refreshInFlight) {
      await refreshInFlight
      return
    }

    const requestedToken = token
    refreshInFlight = (async () => {
      try {
        const session = await api.refresh()
        // Login/register may have replaced the token while refresh was in flight.
        if (api.readToken() !== requestedToken) {
          return
        }
        applySession(session)
      } catch (error) {
        if (error instanceof CandorApiError && error.statusCode === 401) {
          clearSessionIfToken(requestedToken)
        }
        throw error
      } finally {
        refreshInFlight = null
      }
    })()

    await refreshInFlight
  }

  async function waitWhileBootstrapping() {
    while (bootstrapping.value) {
      await new Promise(resolve => setTimeout(resolve, 20))
    }
  }

  async function ensureSession() {
    if (bootstrapping.value) {
      await waitWhileBootstrapping()
      // Previous bootstrap may have exited early after a login token swap.
      if (hasSession.value) {
        return
      }
    }

    /** True when an existing identity was dropped on 401 and we will mint a fresh guest. */
    let clearJourneyBeforeGuest = false

    if (ready.value && hasSession.value) {
      try {
        await refreshIfNeeded()
      } catch (error) {
        // refreshIfNeeded clears on 401 only if that token is still current
        if (error instanceof CandorApiError && error.statusCode === 401) {
          clearJourneyBeforeGuest = !hasSession.value
        }
      }
      if (hasSession.value) {
        return
      }
    }

    bootstrapping.value = true
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
            user.value = toBrief(latest)
          } else {
            user.value = toBrief(me)
          }
          try {
            await refreshIfNeeded()
          } catch {
            // me() already verified this identity — keep it; do not mint guest.
          }
          if (api.readToken() && user.value) {
            return
          }
          // Refresh 401 cleared this token — never mint guest over a concurrent login.
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
          user.value = toBrief(me)
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

      if (hasSession.value || api.readToken()) {
        return
      }

      if (clearJourneyBeforeGuest) {
        useJourneyStore().clearSession()
      }
      const beforeGuest = api.readToken()
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
      bootstrapping.value = false
      ready.value = true
    }
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

  return {
    user,
    expiresAt,
    ready,
    hasSession,
    isMember,
    isLoggedIn,
    displayName,
    initials,
    ensureSession,
    refreshIfNeeded,
    login,
    register,
    logout,
    clearSession,
    applySession,
    applyMe
  }
})
