export default defineNuxtPlugin(() => {
  useJourneyStore().hydrate()
})
