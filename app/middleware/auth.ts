export default defineNuxtRouteMiddleware(async () => {
  const auth = useAuthStore()
  await auth.ensureSession()

  if (!auth.hasSession) {
    // Guest issuance failed (core down). Stay on page without forcing /login —
    // recommend/orders need a token; surface empty until session recovers.
    return
  }
})
