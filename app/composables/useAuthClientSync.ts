/**
 * Prerendered HTML is always the guest snapshot (no localStorage at generate).
 * Keep auth-dependent UI locked until the client has re-read the token so
 * hydration matches SSR and members are not stuck behind the guest gate.
 *
 * Prefer MemberAuthShell: skeleton while !settled, then guest gate or member slot.
 * Do not use memberGateLocked to render the guest gate during !settled — that
 * flashes login UI for members on cold open / F5.
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
  /** Auth still resolving — show skeleton, never guest/login chrome. */
  const authPending = computed(() => !settled.value)
  /**
   * True when guest UI should show (settled + non-member).
   * False while pending so callers can branch: pending → skeleton, locked → gate.
   */
  const memberGateLocked = computed(() => settled.value && !auth.isMember)

  return {
    settled,
    authPending,
    showMember,
    showGuest,
    memberGateLocked,
    sync
  }
}
