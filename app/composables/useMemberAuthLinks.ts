/**
 * Login / register links that preserve the current path as `redirect`
 * (returnUrl after auth). Matches existing /login query contract.
 */
export function useMemberAuthLinks() {
  const localePath = useLocalePath()
  const route = useRoute()

  const loginTo = computed(() =>
    `${localePath('/login')}?redirect=${encodeURIComponent(route.fullPath)}&mode=login`
  )

  const registerTo = computed(() =>
    `${localePath('/login')}?redirect=${encodeURIComponent(route.fullPath)}&mode=register`
  )

  const chatTo = computed(() => localePath('/chat'))

  return {
    loginTo,
    registerTo,
    chatTo
  }
}
