export interface AuthUser {
  id: string
  email: string
  name?: string
}

function nameFromEmail(email: string) {
  const local = email.split('@')[0]?.replace(/[._+-]+/g, ' ').trim() ?? ''

  if (!local) {
    return 'Member'
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

export const useAuthStore = defineStore('auth', () => {
  const user = useCookie<AuthUser | null>('younger-session', {
    default: () => null
  })

  const isLoggedIn = computed(() => Boolean(user.value))

  const displayName = computed(() => {
    if (!user.value) {
      return ''
    }

    return user.value.name || nameFromEmail(user.value.email)
  })

  const initials = computed(() => initialsFromName(displayName.value))

  function login(email: string) {
    user.value = {
      id: 'mock-user',
      email,
      name: nameFromEmail(email)
    }
  }

  function logout() {
    user.value = null
  }

  return {
    user,
    isLoggedIn,
    displayName,
    initials,
    login,
    logout
  }
})
