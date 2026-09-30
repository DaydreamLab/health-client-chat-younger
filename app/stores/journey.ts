import type { ChatMessage } from '~/utils/first-order'
import { snapshotChatMessage } from '~/utils/first-order'
import type { ConversationPackage, GreetingOption, ProfileNextQuestion } from '~/utils/candor-api'

export const JOURNEY_STORAGE_KEY = 'candor.unpaid.journey'

interface JourneySnapshot {
  messages: ChatMessage[]
  hasAnalysis: boolean
  selectedPackageCode: string | null
  conversationId: string | null
  reportId: string | null
  reportDockOpen: boolean
  reportDockCollapsed: boolean
  selectedPackage: ConversationPackage | null
  packageConfirmed: boolean
  goalSelectActive: boolean
  goalOptions: GreetingOption[]
  selectedCodes: string[]
  quizActive: boolean
  activeQuestion: ProfileNextQuestion | null
  postQuizGuided: boolean
  profileGaps: string[]
}

const emptySnapshot = (): JourneySnapshot => ({
  messages: [],
  hasAnalysis: false,
  selectedPackageCode: null,
  conversationId: null,
  reportId: null,
  reportDockOpen: false,
  reportDockCollapsed: false,
  selectedPackage: null,
  packageConfirmed: false,
  goalSelectActive: false,
  goalOptions: [],
  selectedCodes: [],
  quizActive: false,
  activeQuestion: null,
  postQuizGuided: false,
  profileGaps: []
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
    const reportId = typeof parsed.reportId === 'string' ? parsed.reportId : null
    const hasAnalysis = Boolean(parsed.hasAnalysis)
    return {
      ...base,
      ...parsed,
      messages: Array.isArray(parsed.messages) ? parsed.messages : [],
      selectedCodes: Array.isArray(parsed.selectedCodes) ? parsed.selectedCodes : [],
      goalOptions: Array.isArray(parsed.goalOptions) ? parsed.goalOptions : [],
      profileGaps: Array.isArray(parsed.profileGaps) ? parsed.profileGaps : [],
      reportId,
      hasAnalysis,
      // Old snapshots omit dock flags; reopen when a ready report is already bound.
      reportDockOpen: typeof parsed.reportDockOpen === 'boolean'
        ? parsed.reportDockOpen
        : Boolean(reportId && hasAnalysis),
      reportDockCollapsed: Boolean(parsed.reportDockCollapsed)
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
  const reportDockOpen = ref(initial.reportDockOpen)
  const reportDockCollapsed = ref(initial.reportDockCollapsed)
  const selectedPackage = ref<ConversationPackage | null>(initial.selectedPackage)
  const packageConfirmed = ref(initial.packageConfirmed)
  const goalSelectActive = ref(initial.goalSelectActive)
  const goalOptions = ref<GreetingOption[]>(initial.goalOptions)
  const selectedCodes = ref<string[]>(initial.selectedCodes)
  const quizActive = ref(initial.quizActive)
  const activeQuestion = ref<ProfileNextQuestion | null>(initial.activeQuestion)
  const postQuizGuided = ref(initial.postQuizGuided)
  const profileGaps = ref<string[]>(initial.profileGaps)

  function snapshotMessages(): ChatMessage[] {
    return messages.value.map(message => snapshotChatMessage(message))
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
      reportDockOpen: reportDockOpen.value,
      reportDockCollapsed: reportDockCollapsed.value,
      selectedPackage: selectedPackage.value,
      packageConfirmed: packageConfirmed.value,
      goalSelectActive: goalSelectActive.value,
      goalOptions: goalOptions.value,
      selectedCodes: [...selectedCodes.value],
      quizActive: quizActive.value,
      activeQuestion: activeQuestion.value,
      postQuizGuided: postQuizGuided.value,
      profileGaps: [...profileGaps.value]
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
    reportDockOpen.value = false
    reportDockCollapsed.value = false
    selectedPackage.value = null
    packageConfirmed.value = false
    goalSelectActive.value = false
    goalOptions.value = []
    selectedCodes.value = []
    quizActive.value = false
    activeQuestion.value = null
    postQuizGuided.value = false
    profileGaps.value = []
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
    reportDockOpen.value = stored.reportDockOpen
    reportDockCollapsed.value = stored.reportDockCollapsed
    selectedPackage.value = stored.selectedPackage
    packageConfirmed.value = stored.packageConfirmed
    goalSelectActive.value = stored.goalSelectActive
    goalOptions.value = stored.goalOptions
    selectedCodes.value = stored.selectedCodes
    quizActive.value = stored.quizActive
    activeQuestion.value = stored.activeQuestion
    postQuizGuided.value = stored.postQuizGuided
    profileGaps.value = stored.profileGaps
  }

  if (import.meta.client) {
    watch(
      [
        messages,
        hasAnalysis,
        selectedPackageCode,
        conversationId,
        reportId,
        reportDockOpen,
        reportDockCollapsed,
        selectedPackage,
        packageConfirmed,
        goalSelectActive,
        goalOptions,
        selectedCodes,
        quizActive,
        activeQuestion,
        postQuizGuided,
        profileGaps
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
    reportDockOpen,
    reportDockCollapsed,
    selectedPackage,
    packageConfirmed,
    goalSelectActive,
    goalOptions,
    selectedCodes,
    quizActive,
    activeQuestion,
    postQuizGuided,
    profileGaps,
    snapshotMessages,
    clearSession,
    persist,
    hydrate
  }
})
