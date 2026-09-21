import type { ChatMessage, SupplementPlanId } from '~/utils/first-order'

export const useJourneyStore = defineStore('journey', () => {
  const messages = ref<ChatMessage[]>([])
  const hasAnalysis = ref(false)
  const selectedPlanId = ref<SupplementPlanId>('fullTune')

  function snapshotMessages(): ChatMessage[] {
    return messages.value.map(message => ({
      id: message.id,
      role: message.role,
      parts: message.parts.map(part => ({ ...part }))
    }))
  }

  function clearSession() {
    messages.value = []
    hasAnalysis.value = false
    selectedPlanId.value = 'fullTune'
  }

  return {
    messages,
    hasAnalysis,
    selectedPlanId,
    snapshotMessages,
    clearSession
  }
})
