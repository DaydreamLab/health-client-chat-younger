export default defineNuxtRouteMiddleware(async () => {
  // Chat always uses the user chrome (sidebar). Avoid SSR→client layout
  // switches from `default` (flex-col) → `user`, which can leave `flex-col`
  // on the reused root and stack the sidebar above the transcript.
  if (import.meta.client) {
    const auth = useAuthStore()
    await auth.ensureSession()
  }
  setPageLayout('user')
})
