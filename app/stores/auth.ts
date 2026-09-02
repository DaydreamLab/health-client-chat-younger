export interface AuthUser {
  id: string
  email: string
}

export const useAuthStore = defineStore('auth', () => {
  const user = useCookie<AuthUser | null>('younger-session', {
    default: () => null
  })

  const isLoggedIn = computed(() => Boolean(user.value))

  function login(email: string) {
    user.value = {
      id: 'mock-user',
      email
    }
  }

  function logout() {
    user.value = null
  }

  return {
    user,
    isLoggedIn,
    login,
    logout
  }
})
