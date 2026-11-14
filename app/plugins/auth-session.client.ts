export default defineNuxtPlugin(() => {
  const auth = useAuthStore()
  // Do not await: blocking on /users/me／guest leaves the SPA 200.html shell
  // blank until the network returns. Middleware and useAuthClientSync await
  // ensureSession where the UI actually depends on identity.
  void auth.ensureSession().catch(() => {
    // Guest mint / core unavailable must not reject the plugin.
  })
})
