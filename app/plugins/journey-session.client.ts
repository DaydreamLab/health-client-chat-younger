export default defineNuxtPlugin(() => {
  const router = useRouter()
  const journey = useJourneyStore()

  function keepUnpaidChat(path: string) {
    return path.includes('/chat') || path.includes('/recommend') || path.includes('/login')
  }

  router.afterEach((to, from) => {
    if (!from.matched.length) {
      return
    }

    if (from.query.orderId || to.query.orderId) {
      return
    }

    if (keepUnpaidChat(from.path) && !keepUnpaidChat(to.path)) {
      journey.clearSession()
    }
  })
})
