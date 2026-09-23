export default defineNuxtRouteMiddleware(async () => {
  if (import.meta.server) {
    setPageLayout('default')
    return
  }

  const auth = useAuthStore()
  await auth.ensureSession()
  setPageLayout(auth.hasSession ? 'user' : 'default')
})
