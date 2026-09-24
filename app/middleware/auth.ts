export default defineNuxtRouteMiddleware(async () => {
  if (import.meta.server) {
    return
  }

  const auth = useAuthStore()
  await auth.ensureSession()

  if (!auth.hasSession) {
    // Guest issuance failed (core down). Stay on page without forcing /login —
    // recommendations/orders need a token; surface empty until session recovers.
    return
  }
})
