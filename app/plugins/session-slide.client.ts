import { bindSessionActivity } from '~/utils/session-activity'

export default defineNuxtPlugin(() => {
  const auth = useAuthStore()

  function bump() {
    void auth.slideIfActive()
  }

  bindSessionActivity(bump)
  window.addEventListener('pointerdown', bump, { passive: true })
  window.addEventListener('keydown', bump)
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      bump()
    }
  })
  window.setInterval(() => {
    if (document.visibilityState === 'visible') {
      bump()
    }
  }, 60_000)
})
