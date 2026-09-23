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

  function clearSession() {
    api.writeToken(null)
    user.value = null
    expiresAt.value = null
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

    refreshInFlight = (async () => {
      try {
        applySession(await api.refresh())
      } catch (error) {
        if (error instanceof CandorApiError && error.statusCode === 401) {
          clearSession()
        }
        throw error
      } finally {
        refreshInFlight = null
      }
    })()

    await refreshInFlight
  }

  async function ensureSession() {
    if (bootstrapping.value) {
      while (bootstrapping.value) {
        await new Promise(resolve => setTimeout(resolve, 20))
      }
      return
    }

    if (ready.value && hasSession.value) {
      try {
        await refreshIfNeeded()
      } catch {
        // refreshIfNeeded clears on 401; fall through to guest below if needed
      }
      if (hasSession.value) {
        return
      }
    }

    bootstrapping.value = true
    try {
      const token = api.readToken()
      if (token) {
        try {
          const me = await api.me()
          user.value = toBrief(me)
          try {
            await refreshIfNeeded()
          } catch {
            // ignore; 401 cleared token
          }
          if (api.readToken() && user.value) {
            return
          }
        } catch (error) {
          if (error instanceof CandorApiError && error.statusCode === 401) {
            clearSession()
          } else {
            clearSession()
          }
        }
      }

      applySession(await api.guest())
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
    applySession
  }
})
