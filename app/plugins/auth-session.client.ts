export default defineNuxtPlugin(async () => {
  const auth = useAuthStore()
  try {
    await auth.ensureSession()
  } catch {
    // Guest mint / core unavailable must not block first paint.
  }
})
