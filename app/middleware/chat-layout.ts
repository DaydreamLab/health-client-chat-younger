export default defineNuxtRouteMiddleware(async () => {
  const auth = useAuthStore()
  await auth.ensureSession()
  setPageLayout(auth.hasSession ? 'user' : 'default')
})
