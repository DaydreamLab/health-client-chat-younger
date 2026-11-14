/**
 * Prerendered HTML is always the guest snapshot (no localStorage at generate).
 * Keep auth-dependent UI locked until the client has re-read the token so
 * hydration matches SSR and members are not stuck behind the guest gate.
 */
export function useAuthClientSync() {
  const auth = useAuthStore()
  const settled = ref(false)

  async function sync() {
    if (import.meta.server) {
      return
    }
    try {
      await auth.ensureSession()
    } catch {
      // Core down: leave session empty; callers still unlock the gate.
    } finally {
      settled.value = true
    }
  }

  onMounted(() => {
    void sync()
  })

  const showMember = computed(() => settled.value && auth.isMember)
  const showGuest = computed(() => settled.value && auth.ready && !auth.isMember)
  /** Member-only surfaces stay gated until client sync finishes. */
  const memberGateLocked = computed(() => !settled.value || !auth.isMember)

  return {
    settled,
    showMember,
    showGuest,
    memberGateLocked,
    sync
  }
}
