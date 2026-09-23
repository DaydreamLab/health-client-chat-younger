import type { ChatMessage, SupplementPlanId } from '~/utils/first-order'

export const useJourneyStore = defineStore('journey', () => {
  const messages = ref<ChatMessage[]>([])
  const hasAnalysis = ref(false)
  const selectedPlanId = ref<SupplementPlanId>('fullTune')
  const conversationId = ref<string | null>(null)
  const reportId = ref<string | null>(null)

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
    conversationId.value = null
    reportId.value = null
  }

  return {
    messages,
    hasAnalysis,
    selectedPlanId,
    conversationId,
    reportId,
    snapshotMessages,
    clearSession
  }
})
