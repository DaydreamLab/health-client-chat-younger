export default defineNuxtRouteMiddleware(() => {
  const auth = useAuthStore()
  setPageLayout(auth.isLoggedIn ? 'member' : 'default')
})
