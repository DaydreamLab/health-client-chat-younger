import type { ChatMessage } from '~/utils/first-order'
import { snapshotChatMessage } from '~/utils/first-order'
import { normalizeStoredChatMessages } from '~/utils/chat-history'
import type { ConversationPackage, GreetingOption, ProfileNextQuestion } from '~/utils/candor-api'
import type { ExpertReviewUiStatus } from '~/utils/chat-turn-actions'
import {
  normalizeConversationPath,
  type ConversationPath
} from '~/utils/path-contract'

export const JOURNEY_STORAGE_KEY = 'candor.unpaid.journey'

interface JourneySnapshot {
  messages: ChatMessage[]
  hasAnalysis: boolean
  selectedPackageCode: string | null
  conversationId: string | null
  reportId: string | null
  reportDockOpen: boolean
  reportDockCollapsed: boolean
  reportInterpretSent: boolean
  selectedPackage: ConversationPackage | null
  packageConfirmed: boolean
  goalSelectActive: boolean
  /** Required ask for report (mirrors goalSelectActive; driven by ask_report). */
  reportAskActive: boolean
  goalOptions: GreetingOption[]
  selectedCodes: string[]
  quizActive: boolean
  activeQuestion: ProfileNextQuestion | null
  postQuizGuided: boolean
  profileGaps: string[]
  clarifyingGoals: string[]
  expertReviewStatus: ExpertReviewUiStatus
  /**
   * Path contract A／B／C. null = entry not chosen yet (or legacy session).
   * Synced to core when path API is available (see useCandorApi.setConversationPath).
   */
  conversationPath: ConversationPath | null
  /**
   * Path C: waiting for first upload; cancel／skip without report → demote to B.
   */
  pathCAwaitingUpload: boolean
}

const emptySnapshot = (): JourneySnapshot => ({
  messages: [],
  hasAnalysis: false,
  selectedPackageCode: null,
  conversationId: null,
  reportId: null,
  reportDockOpen: false,
  reportDockCollapsed: false,
  reportInterpretSent: false,
  selectedPackage: null,
  packageConfirmed: false,
  goalSelectActive: false,
  reportAskActive: false,
  goalOptions: [],
  selectedCodes: [],
  quizActive: false,
  activeQuestion: null,
  postQuizGuided: false,
  profileGaps: [],
  clarifyingGoals: [],
  expertReviewStatus: 'none',
  conversationPath: null,
  pathCAwaitingUpload: false
})

function normalizeExpertReviewStatus(value: unknown): ExpertReviewUiStatus {
  if (value === 'awaiting_review' || value === 'reviewed' || value === 'none') {
    return value
  }
  return 'none'
}

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
    // hasAnalysis requires a bound reportId. Older builds set the flag when opening
    // recommendations without a report, which hid the empty report dock on chat pages.
    const hasAnalysis = Boolean(parsed.hasAnalysis) && reportId !== null
    return {
      ...base,
      ...parsed,
      messages: normalizeStoredChatMessages(parsed.messages),
      selectedCodes: Array.isArray(parsed.selectedCodes) ? parsed.selectedCodes : [],
      goalOptions: Array.isArray(parsed.goalOptions) ? parsed.goalOptions : [],
      profileGaps: Array.isArray(parsed.profileGaps) ? parsed.profileGaps : [],
      clarifyingGoals: Array.isArray(parsed.clarifyingGoals) ? parsed.clarifyingGoals : [],
      reportId,
      hasAnalysis,
      // Page load: keep dock closed unless handoff explicitly opened it (e.g. 我的健康 → 查看對話).
      reportDockOpen: reportId !== null && parsed.reportDockOpen === true,
      // Remember last collapse preference for when the dock is opened again.
      reportDockCollapsed: typeof parsed.reportDockCollapsed === 'boolean'
        ? parsed.reportDockCollapsed
        : true,
      // Old snapshots omit this flag. A bound report already consumed the auto-send path.
      reportInterpretSent: typeof parsed.reportInterpretSent === 'boolean'
        ? parsed.reportInterpretSent
        : hasAnalysis,
      expertReviewStatus: normalizeExpertReviewStatus(parsed.expertReviewStatus),
      conversationPath: normalizeConversationPath(parsed.conversationPath),
      pathCAwaitingUpload: parsed.pathCAwaitingUpload === true
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
  const reportInterpretSent = ref(initial.reportInterpretSent)
  const selectedPackage = ref<ConversationPackage | null>(initial.selectedPackage)
  const packageConfirmed = ref(initial.packageConfirmed)
  const goalSelectActive = ref(initial.goalSelectActive)
  const reportAskActive = ref(initial.reportAskActive === true)
  const goalOptions = ref<GreetingOption[]>(initial.goalOptions)
  const selectedCodes = ref<string[]>(initial.selectedCodes)
  const quizActive = ref(initial.quizActive)
  const activeQuestion = ref<ProfileNextQuestion | null>(initial.activeQuestion)
  const postQuizGuided = ref(initial.postQuizGuided)
  const profileGaps = ref<string[]>(initial.profileGaps)
  const clarifyingGoals = ref<string[]>(initial.clarifyingGoals)
  const expertReviewStatus = ref<ExpertReviewUiStatus>(initial.expertReviewStatus)
  const conversationPath = ref<ConversationPath | null>(initial.conversationPath)
  const pathCAwaitingUpload = ref(initial.pathCAwaitingUpload)

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
      reportInterpretSent: reportInterpretSent.value,
      selectedPackage: selectedPackage.value,
      packageConfirmed: packageConfirmed.value,
      goalSelectActive: goalSelectActive.value,
      reportAskActive: reportAskActive.value,
      goalOptions: goalOptions.value,
      selectedCodes: [...selectedCodes.value],
      quizActive: quizActive.value,
      activeQuestion: activeQuestion.value,
      postQuizGuided: postQuizGuided.value,
      profileGaps: [...profileGaps.value],
      clarifyingGoals: [...clarifyingGoals.value],
      expertReviewStatus: expertReviewStatus.value,
      conversationPath: conversationPath.value,
      pathCAwaitingUpload: pathCAwaitingUpload.value
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
    reportInterpretSent.value = false
    selectedPackage.value = null
    packageConfirmed.value = false
    goalSelectActive.value = false
    reportAskActive.value = false
    goalOptions.value = []
    selectedCodes.value = []
    quizActive.value = false
    activeQuestion.value = null
    postQuizGuided.value = false
    profileGaps.value = []
    clarifyingGoals.value = []
    expertReviewStatus.value = 'none'
    conversationPath.value = null
    pathCAwaitingUpload.value = false
    if (import.meta.client) {
      localStorage.removeItem(JOURNEY_STORAGE_KEY)
    }
  }

  function hydrate() {
    if (!import.meta.client) {
      return
    }
    const stored = readStored()
    messages.value = normalizeStoredChatMessages(stored.messages)
    hasAnalysis.value = stored.hasAnalysis
    selectedPackageCode.value = stored.selectedPackageCode ?? null
    conversationId.value = stored.conversationId
    reportId.value = stored.reportId
    reportDockOpen.value = stored.reportDockOpen
    reportDockCollapsed.value = stored.reportDockCollapsed
    reportInterpretSent.value = stored.reportInterpretSent
    selectedPackage.value = stored.selectedPackage
    packageConfirmed.value = stored.packageConfirmed
    goalSelectActive.value = stored.goalSelectActive
    reportAskActive.value = stored.reportAskActive === true
    goalOptions.value = stored.goalOptions
    selectedCodes.value = stored.selectedCodes
    quizActive.value = stored.quizActive
    activeQuestion.value = stored.activeQuestion
    postQuizGuided.value = stored.postQuizGuided
    profileGaps.value = stored.profileGaps
    clarifyingGoals.value = stored.clarifyingGoals
    expertReviewStatus.value = stored.expertReviewStatus
    conversationPath.value = stored.conversationPath
    pathCAwaitingUpload.value = stored.pathCAwaitingUpload
  }

  /**
   * Point journey at an expert-case conversation (e.g.「查看對話」／「查看推薦方案」).
   * Clears the prior in-progress transcript／transient CTAs and persists synchronously so
   * ChatPanel hydrate() cannot race-restore the wrong conversationId from localStorage.
   */
  function focusExpertReviewCase(input: {
    conversationId: string
    healthReportId?: string | null
    expertReviewStatus: ExpertReviewUiStatus
  }) {
    conversationId.value = input.conversationId
    expertReviewStatus.value = input.expertReviewStatus

    const nextReportId = typeof input.healthReportId === 'string' && input.healthReportId
      ? input.healthReportId
      : null
    if (nextReportId) {
      reportId.value = nextReportId
      hasAnalysis.value = true
      reportInterpretSent.value = true
      // Match ChatPanel restoreReportSession after F5: collapsed dock bar, not expanded table.
      reportDockOpen.value = true
      reportDockCollapsed.value = true
    } else {
      reportId.value = null
      hasAnalysis.value = false
      reportInterpretSent.value = false
      reportDockOpen.value = false
      reportDockCollapsed.value = false
    }

    messages.value = []
    goalSelectActive.value = false
    reportAskActive.value = false
    quizActive.value = false
    activeQuestion.value = null
    postQuizGuided.value = false
    profileGaps.value = []
    clarifyingGoals.value = []
    goalOptions.value = []
    selectedCodes.value = []
    pathCAwaitingUpload.value = false

    persist()
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
        reportInterpretSent,
        selectedPackage,
        packageConfirmed,
        goalSelectActive,
        reportAskActive,
        goalOptions,
        selectedCodes,
        quizActive,
        activeQuestion,
        postQuizGuided,
        profileGaps,
        clarifyingGoals,
        expertReviewStatus,
        conversationPath,
        pathCAwaitingUpload
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
    reportInterpretSent,
    selectedPackage,
    packageConfirmed,
    goalSelectActive,
    reportAskActive,
    goalOptions,
    selectedCodes,
    quizActive,
    activeQuestion,
    postQuizGuided,
    profileGaps,
    clarifyingGoals,
    expertReviewStatus,
    conversationPath,
    pathCAwaitingUpload,
    snapshotMessages,
    clearSession,
    persist,
    hydrate,
    focusExpertReviewCase
  }
})
