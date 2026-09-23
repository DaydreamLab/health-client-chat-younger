import type { ChatMessage } from '~/utils/first-order'
import type { ConversationPackage, GreetingOption, ProfileNextQuestion } from '~/utils/candor-api'

export const JOURNEY_STORAGE_KEY = 'candor.unpaid.journey'

interface JourneySnapshot {
  messages: ChatMessage[]
  hasAnalysis: boolean
  selectedPackageCode: string | null
  conversationId: string | null
  reportId: string | null
  selectedPackage: ConversationPackage | null
  packageConfirmed: boolean
  goalSelectActive: boolean
  goalOptions: GreetingOption[]
  selectedCodes: string[]
  quizActive: boolean
  activeQuestion: ProfileNextQuestion | null
  postQuizGuided: boolean
}

const emptySnapshot = (): JourneySnapshot => ({
  messages: [],
  hasAnalysis: false,
  selectedPackageCode: null,
  conversationId: null,
  reportId: null,
  selectedPackage: null,
  packageConfirmed: false,
  goalSelectActive: false,
  goalOptions: [],
  selectedCodes: [],
  quizActive: false,
  activeQuestion: null,
  postQuizGuided: false
})

function readStored(): JourneySnapshot {
  if (!import.meta.client) {
    return emptySnapshot()
  }

  try {
    const raw = localStorage.getItem(JOURNEY_STORAGE_KEY)
    if (!raw) {
      return emptySnapshot()
    }
    const parsed = JSON.parse(raw) as Partial<JourneySnapshot>
    const base = emptySnapshot()
    return {
      ...base,
      ...parsed,
      messages: Array.isArray(parsed.messages) ? parsed.messages : [],
      selectedCodes: Array.isArray(parsed.selectedCodes) ? parsed.selectedCodes : [],
      goalOptions: Array.isArray(parsed.goalOptions) ? parsed.goalOptions : []
    }
  } catch {
    return emptySnapshot()
  }
}

export const useJourneyStore = defineStore('journey', () => {
  const initial = readStored()

  const messages = ref<ChatMessage[]>(initial.messages)
  const hasAnalysis = ref(initial.hasAnalysis)
  const selectedPackageCode = ref<string | null>(initial.selectedPackageCode ?? null)
  const conversationId = ref<string | null>(initial.conversationId)
  const reportId = ref<string | null>(initial.reportId)
  const selectedPackage = ref<ConversationPackage | null>(initial.selectedPackage)
  const packageConfirmed = ref(initial.packageConfirmed)
  const goalSelectActive = ref(initial.goalSelectActive)
  const goalOptions = ref<GreetingOption[]>(initial.goalOptions)
  const selectedCodes = ref<string[]>(initial.selectedCodes)
  const quizActive = ref(initial.quizActive)
  const activeQuestion = ref<ProfileNextQuestion | null>(initial.activeQuestion)
  const postQuizGuided = ref(initial.postQuizGuided)

  function snapshotMessages(): ChatMessage[] {
    return messages.value.map(message => ({
      id: message.id,
      role: message.role,
      parts: message.parts.map(part => ({ ...part }))
    }))
  }

  function persist() {
    if (!import.meta.client) {
      return
    }

    const payload: JourneySnapshot = {
      messages: snapshotMessages(),
      hasAnalysis: hasAnalysis.value,
      selectedPackageCode: selectedPackageCode.value,
      conversationId: conversationId.value,
      reportId: reportId.value,
      selectedPackage: selectedPackage.value,
      packageConfirmed: packageConfirmed.value,
      goalSelectActive: goalSelectActive.value,
      goalOptions: goalOptions.value,
      selectedCodes: [...selectedCodes.value],
      quizActive: quizActive.value,
      activeQuestion: activeQuestion.value,
      postQuizGuided: postQuizGuided.value
    }

    if (!payload.conversationId && payload.messages.length === 0) {
      localStorage.removeItem(JOURNEY_STORAGE_KEY)
      return
    }

    localStorage.setItem(JOURNEY_STORAGE_KEY, JSON.stringify(payload))
  }

  function clearSession() {
    messages.value = []
    hasAnalysis.value = false
    selectedPackageCode.value = null
    conversationId.value = null
    reportId.value = null
    selectedPackage.value = null
    packageConfirmed.value = false
    goalSelectActive.value = false
    goalOptions.value = []
    selectedCodes.value = []
    quizActive.value = false
    activeQuestion.value = null
    postQuizGuided.value = false
    if (import.meta.client) {
      localStorage.removeItem(JOURNEY_STORAGE_KEY)
    }
  }

  function hydrate() {
    if (!import.meta.client) {
      return
    }
    const stored = readStored()
    messages.value = stored.messages
    hasAnalysis.value = stored.hasAnalysis
    selectedPackageCode.value = stored.selectedPackageCode ?? null
    conversationId.value = stored.conversationId
    reportId.value = stored.reportId
    selectedPackage.value = stored.selectedPackage
    packageConfirmed.value = stored.packageConfirmed
    goalSelectActive.value = stored.goalSelectActive
    goalOptions.value = stored.goalOptions
    selectedCodes.value = stored.selectedCodes
    quizActive.value = stored.quizActive
    activeQuestion.value = stored.activeQuestion
    postQuizGuided.value = stored.postQuizGuided
  }

  if (import.meta.client) {
    watch(
      [
        messages,
        hasAnalysis,
        selectedPackageCode,
        conversationId,
        reportId,
        selectedPackage,
        packageConfirmed,
        goalSelectActive,
        goalOptions,
        selectedCodes,
        quizActive,
        activeQuestion,
        postQuizGuided
      ],
      () => {
        persist()
      },
      { deep: true }
    )
  }

  return {
    messages,
    hasAnalysis,
    selectedPackageCode,
    conversationId,
    reportId,
    selectedPackage,
    packageConfirmed,
    goalSelectActive,
    goalOptions,
    selectedCodes,
    quizActive,
    activeQuestion,
    postQuizGuided,
    snapshotMessages,
    clearSession,
    persist,
    hydrate
  }
})
