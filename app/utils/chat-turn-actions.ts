import type { ChatMessage, ChatMessageOption } from './first-order'
import { turnChoicesForMessage } from './chat-intake'
import {
  isBasicProfileComplete,
  isRequiredBasicGapCode,
  shouldSuppressGuidanceCtas,
  completionCtaJourneyAllows,
  type ConversationPath
} from './path-contract'
import { coerceRetainedStatusForNonLatest } from './cta-interaction'
import {
  hasCtaInteractionMeta,
  hasReplyActionsColumn,
  isUsableReplyActions,
  NON_GAP_CHOOSE_OPTION_KINDS,
  projectReplyActionsToCtas,
  type ChooseOptionPayload,
  type CtaControlStatus,
  type ReplyActions,
  type ReplyActionsCtaProjection,
  type ReplyActionsRoundStatus,
  type VitalsField
} from './reply-actions'

/**
 * Chat bubble TurnActions visibility rules (single source of truth).
 *
 * Path contract (Irice 2026-11-02)：
 * - 完成 CTA 只信 usable `offer_recommend`（core stripOfferRecommend 已在 A 拿掉）。
 * - FE 不再依 path A／path-null 藏完成鈕；journey 安全門（readonly／latest／pending／required ask）仍在。
 * - goals／報告／optional profile 不挡完成 CTA。
 * - ❌ 不在 none／degraded／缺 RA 時 FE 強掛。
 * - upload／checkup 只走 usable RA；lab_report 問卷進行中不預掛。
 */

export interface ChatTurnUiContext {
  readonlyMode: boolean
  escalated: boolean
  pending: boolean
  goalSelectActive: boolean
  /**
   * Required ask for report (mirrors goalSelectActive). Driven by usable
   * `ask_report`. Under path contract, does **not** block completion CTA.
   */
  reportAskActive: boolean
  hasReportAnalysis: boolean
  reportRetry: boolean
  /** individual_tests_url resolved and non-empty */
  checkupLinkReady: boolean
  lastAssistantId?: string
  /**
   * Path contract context. When `path` is null, completion CTA falls back to
   * legacy usable-`offer_recommend` rules.
   */
  conversationPath?: ConversationPath | null
  /** Open profile gaps; used with path to decide basic-complete gate. */
  openProfileGaps?: readonly string[]
  /**
   * lab_report choose_option／required ask in progress — suppress bubble
   * upload／checkup until answered (Irice).
   */
  labReportQuizActive?: boolean
  /**
   * When true, show entry path chips (A／B／C) instead of goals on this bubble.
   * Caller supplies choices separately; this flag only blocks recommend／guidance.
   */
  pathEntryPending?: boolean
}

/** Mirrors core ConsultationGoal::defaultCatalog() for empty stream options. */
export const DEFAULT_CONSULTATION_GOAL_OPTIONS: ChatMessageOption[] = [
  { code: 'sleep', label: '睡眠' },
  { code: 'weight_loss', label: '減重' },
  { code: 'immune_boost', label: '免疫提升' },
  { code: 'cognitive_function', label: '認知功能' },
  { code: 'gastrointestinal', label: '腸胃道' }
]

const MIN_GOAL_CHIPS = 2

export function resolveEffectiveGoalOptions(input: {
  goalSelectActive: boolean
  goalOptions: ChatMessageOption[]
  intake?: ChatMessage
  message?: ChatMessage
}): ChatMessageOption[] {
  if (!input.goalSelectActive) {
    return input.goalOptions
  }
  const candidates = [
    input.goalOptions,
    input.message?.options ?? [],
    input.intake?.options ?? [],
    DEFAULT_CONSULTATION_GOAL_OPTIONS
  ]
  for (const list of candidates) {
    if (list.length >= MIN_GOAL_CHIPS) {
      return list
    }
  }
  return []
}

export function isLatestAssistantMessage(
  message: ChatMessage,
  lastAssistantId?: string
): boolean {
  return message.role === 'assistant'
    && lastAssistantId !== undefined
    && message.id === lastAssistantId
}

export type ExpertReviewUiStatus = 'none' | 'awaiting_review' | 'reviewed'

/**
 * Journey gates for recommend-slot buttons when usable RA includes
 * `offer_recommend` (part of **完成 CTA**).
 *
 * Journey slot only — does not invent buttons. Callers still require usable
 * `offer_recommend`. Path A／null gating lives on core (stripOfferRecommend).
 */
export function recommendCtaVisible(input: {
  readonlyMode: boolean
  escalated: boolean
  goalSelectActive: boolean
  reportAskActive?: boolean
  profileQuestionActive: boolean
  isLatestAssistant: boolean
  reportRetry: boolean
  pending?: boolean
  hasReportAnalysis?: boolean
  conversationPath?: ConversationPath | null
  basicProfileComplete?: boolean
  /** Active question is one of sex／age／height／weight. */
  requiredProfileQuestionActive?: boolean
  pathEntryPending?: boolean
}): boolean {
  void input.goalSelectActive
  void input.reportAskActive
  void input.hasReportAnalysis
  void input.conversationPath
  void input.basicProfileComplete
  if (input.pathEntryPending) {
    return false
  }
  return completionCtaJourneyAllows({
    readonlyMode: input.readonlyMode,
    escalated: input.escalated,
    isLatestAssistant: input.isLatestAssistant,
    reportRetry: input.reportRetry,
    pending: input.pending,
    requiredProfileQuestionActive: input.requiredProfileQuestionActive
      ?? input.profileQuestionActive
  })
}

/** Base journey gate for recommend-slot CTAs (submit or view). */
export function recommendSlotVisible(input: Parameters<typeof recommendCtaVisible>[0]): boolean {
  return recommendCtaVisible(input)
}

/** 「提交專家判讀」— only before a case exists / while none. */
export function submitExpertReviewCtaVisible(
  input: Parameters<typeof recommendCtaVisible>[0] & { expertReviewStatus: ExpertReviewUiStatus }
): boolean {
  return recommendCtaVisible(input) && input.expertReviewStatus === 'none'
}

/** Real「查看推薦方案」— only after reviewed. */
export function viewRecommendCtaVisible(
  input: Parameters<typeof recommendCtaVisible>[0] & { expertReviewStatus: ExpertReviewUiStatus }
): boolean {
  return recommendCtaVisible(input) && input.expertReviewStatus === 'reviewed'
}

/** `/chat-ai` standard flow: same recommend slot, always「查看推薦方案」. */
export function standardViewRecommendCtaVisible(
  input: Parameters<typeof recommendCtaVisible>[0]
): boolean {
  return recommendCtaVisible(input)
}

/**
 * Legacy `uploadOffer` no longer paints bubble upload.
 * Upload CTA is reply_actions `ask_report` only.
 * @deprecated Kept so call sites / tests compile; always false.
 */
export function uploadCtaVisible(
  _ctx: ChatTurnUiContext,
  _message: ChatMessage
): boolean {
  return false
}

/**
 * Legacy `checkupOffer` no longer paints bubble checkup.
 * External checkup CTA is reply_actions `offer_checkup` only (RA path above).
 * @deprecated Kept so call sites / tests compile; always false.
 */
export function checkupCtaVisible(
  _ctx: ChatTurnUiContext,
  _message: ChatMessage
): boolean {
  return false
}

/**
 * Legacy want-more (recommend-slot auto + wantMoreTestsOffer) removed.
 * Bubble外連只走 reply_actions `offer_checkup`；dock 另見 reportDockBarVisibility（#23 未動）.
 * @deprecated Always false.
 */
export function wantMoreTestsCtaVisible(
  _ctx: ChatTurnUiContext,
  _message: ChatMessage
): boolean {
  return false
}

export interface ReportDockBarInput {
  ctx: ChatTurnUiContext
  /** Active profile question on latest intake (same as bubble recommend guard). */
  profileQuestionActive: boolean
  /**
   * Kept for callers / persistence; Irice 2026-10-28：有報告時 interpret 常駐，
   * 不再依 reportInterpretSent 隱藏。
   */
  reportInterpretSent: boolean
  promptMode: boolean
}

export interface ReportDockBarVisibility {
  /** Result dock only — never on empty prompt bar. */
  showExplainHighlights: boolean
  /** Visible but not clickable when journey blocks (readonly／escalated／…). */
  explainHighlightsDisabled: boolean
  showWantMoreTestsLink: boolean
}

/**
 * Top report dock bar.
 * Irice 2026-10-28：有報告結果列時「請助理說明重點」常駐可見；
 * readonly／escalated／pending／reportRetry／profile 問卷中改 disabled，不整顆消失。
 * 空 dock（promptMode）仍只顯示上傳／我想檢查。
 */
export function reportDockBarVisibility(input: ReportDockBarInput): ReportDockBarVisibility {
  const { ctx, profileQuestionActive, promptMode } = input
  if (promptMode) {
    return {
      showExplainHighlights: false,
      explainHighlightsDisabled: false,
      showWantMoreTestsLink: false
    }
  }
  const showExplainHighlights = ctx.hasReportAnalysis
  const explainHighlightsDisabled = showExplainHighlights
    && (ctx.readonlyMode
      || ctx.escalated
      || ctx.pending
      || ctx.reportRetry
      || profileQuestionActive)
  const showWantMoreTestsLink = ctx.hasReportAnalysis
    && !ctx.readonlyMode
    && !ctx.escalated
    && !ctx.pending
    && ctx.checkupLinkReady
  return {
    showExplainHighlights,
    explainHighlightsDisabled,
    showWantMoreTestsLink
  }
}

export function retryCtaVisible(): boolean {
  return false
}

export function turnConfirmVisible(choicesCount: number, needsMultiConfirm: boolean): boolean {
  return choicesCount > 0 && needsMultiConfirm
}

export interface TurnActionsVisibility {
  choices: ChatMessageOption[]
  showConfirm: boolean
  showUpload: boolean
  showCheckup: boolean
  /** offer_full_test — 報告指標未達門檻外連（排在其他 CTA 後面）. */
  showFullTest: boolean
  /** offer_expert_booking — 預約專家諮詢（導 /expert-booking）. */
  showExpertBooking: boolean
  showWantMoreTests: boolean
  /** @deprecated Prefer showSubmitReview / showViewRecommend */
  showRecommend: boolean
  showSubmitReview: boolean
  showViewRecommend: boolean
  showRetry: boolean
  /** ask_vitals numeric fields (reply_actions path only). */
  vitalsFields: VitalsField[]
  vitalsGapCode: string | null
  vitalsStatus: CtaControlStatus | null
  vitalsHasStoredValue: boolean
  vitalsStoredValue: number | null
  confirmStatus: CtaControlStatus | null
  roundStatus: ReplyActionsRoundStatus | null
  /** offer_checkup payload.url when set; else use journey default. */
  checkupUrlOverride: string | null
  /** offer_full_test payload.url（或預設 Body Decode）. */
  fullTestUrlOverride: string | null
  fullTestLabelOverride: string | null
  fullTestCopyOverride: string | null
  fullTestMarkerCount: number | null
  expertBookingPathOverride: string | null
  expertBookingLabelOverride: string | null
  /** True when CTAs come from reply_actions column (usable or intentional empty). */
  fromReplyActions: boolean
  /** Exclusive chip codes when choose_option drives selection. */
  exclusiveCodes: string[]
  replyProjection: ReplyActionsCtaProjection | null
}

/**
 * Design B / run21: older bubbles may keep CTAs visible, but keypad／chips
 * must not remain `current`. Preserve selected tones; force round historical.
 */
export function freezeNonLatestRetainedVisibility(
  visibility: TurnActionsVisibility
): TurnActionsVisibility {
  const vitalsPreferSelected = visibility.vitalsStatus === 'selected'
    || (visibility.vitalsHasStoredValue && visibility.vitalsStoredValue != null)
  return {
    ...visibility,
    choices: visibility.choices.map(choice => ({
      ...choice,
      status: coerceRetainedStatusForNonLatest(choice.status)
    })),
    vitalsStatus: visibility.vitalsFields.length
      ? coerceRetainedStatusForNonLatest(visibility.vitalsStatus, {
          preferSelected: vitalsPreferSelected
        })
      : visibility.vitalsStatus,
    confirmStatus: visibility.showConfirm
      ? coerceRetainedStatusForNonLatest(visibility.confirmStatus)
      : visibility.confirmStatus,
    roundStatus: 'historical'
  }
}

function emptyReplyExtras(): Pick<
  TurnActionsVisibility,
  | 'vitalsFields'
  | 'vitalsGapCode'
  | 'vitalsStatus'
  | 'vitalsHasStoredValue'
  | 'vitalsStoredValue'
  | 'confirmStatus'
  | 'roundStatus'
  | 'checkupUrlOverride'
  | 'fullTestUrlOverride'
  | 'fullTestLabelOverride'
  | 'fullTestCopyOverride'
  | 'fullTestMarkerCount'
  | 'expertBookingPathOverride'
  | 'expertBookingLabelOverride'
  | 'fromReplyActions'
  | 'exclusiveCodes'
  | 'replyProjection'
> {
  return {
    vitalsFields: [],
    vitalsGapCode: null,
    vitalsStatus: null,
    vitalsHasStoredValue: false,
    vitalsStoredValue: null,
    confirmStatus: null,
    roundStatus: null,
    checkupUrlOverride: null,
    fullTestUrlOverride: null,
    fullTestLabelOverride: null,
    fullTestCopyOverride: null,
    fullTestMarkerCount: null,
    expertBookingPathOverride: null,
    expertBookingLabelOverride: null,
    fromReplyActions: false,
    exclusiveCodes: ['none', 'none_of_above'],
    replyProjection: null
  }
}

function emptyTurnActions(fromReplyActions: boolean): TurnActionsVisibility {
  return {
    choices: [],
    showConfirm: false,
    showUpload: false,
    showCheckup: false,
    showFullTest: false,
    showExpertBooking: false,
    showWantMoreTests: false,
    showRecommend: false,
    showSubmitReview: false,
    showViewRecommend: false,
    showRetry: false,
    ...emptyReplyExtras(),
    fromReplyActions
  }
}

function projectGates(input: {
  replyActions: ReplyActions
  canShowRecommendSlot: boolean
  canShowUpload: boolean
  canShowCheckup: boolean
  canShowVitals: boolean
  expertReviewStatus: ExpertReviewUiStatus
  standardFlow: boolean
  checkupLinkReady: boolean
}): {
  projection: ReplyActionsCtaProjection
  showCheckup: boolean
} {
  const projection = projectReplyActionsToCtas({
    replyActions: input.replyActions,
    canShowRecommendSlot: input.canShowRecommendSlot,
    canShowUpload: input.canShowUpload,
    canShowCheckup: input.canShowCheckup,
    canShowVitals: input.canShowVitals,
    expertReviewStatus: input.expertReviewStatus,
    flow: input.standardFlow ? 'standard' : undefined
  })
  const checkupFromPayload = Boolean(projection.checkupUrlOverride)
  const showCheckup = projection.flags.showCheckup
    && (input.checkupLinkReady || checkupFromPayload)
  return { projection, showCheckup }
}

function isNonGapChoosePayload(choose: ChooseOptionPayload): boolean {
  // kind=lab_report（core #100）或過渡 gap_code=lab_report：必問，非 gap host。
  if (choose.kind === 'lab_report' || choose.gap_code === 'lab_report') {
    return true
  }
  return Boolean(choose.kind && NON_GAP_CHOOSE_OPTION_KINDS.has(choose.kind))
}

/** Companion path_switch／continue_consultation chips when another choose_option is primary. */
function companionNonGapChoices(projection: ReplyActionsCtaProjection): ChatMessageOption[] {
  const extras: ChatMessageOption[] = []
  if (projection.pathSwitch && projection.chooseOption?.kind !== 'path_switch') {
    extras.push(...(projection.pathSwitch.options ?? []))
  }
  if (projection.continueConsultation
    && projection.chooseOption?.kind !== 'continue_consultation') {
    extras.push(...(projection.continueConsultation.options ?? []))
  }
  return extras
}

/** Split gap-bound choices from free / lab_followup / consultation_goals / lab_report / path_switch. */
function splitProjectionChoices(projection: ReplyActionsCtaProjection): {
  gapChoices: ChatMessageOption[]
  gapConfirm: boolean
  nonGapChoices: ChatMessageOption[]
  nonGapConfirm: boolean
} {
  const choose = projection.chooseOption
  const companion = companionNonGapChoices(projection)
  const companionCodes = new Set(companion.map(option => option.code))
  if (!choose) {
    // ask_goal chips are required-ask (non-gap), like report.
    if (projection.askGoal) {
      return {
        gapChoices: [],
        gapConfirm: false,
        nonGapChoices: projection.flags.choices,
        nonGapConfirm: projection.flags.showConfirm
      }
    }
    return {
      gapChoices: [],
      gapConfirm: false,
      nonGapChoices: companion,
      nonGapConfirm: false
    }
  }
  if (isNonGapChoosePayload(choose)) {
    return {
      gapChoices: [],
      gapConfirm: false,
      // flags.choices already includes companion path_switch／continue when present.
      nonGapChoices: projection.flags.choices,
      nonGapConfirm: projection.flags.showConfirm
    }
  }
  // Gap primary: keep profile chips on gap host; peel companion chips to non-gap.
  return {
    gapChoices: projection.flags.choices.filter(option => !companionCodes.has(option.code)),
    gapConfirm: projection.flags.showConfirm,
    nonGapChoices: companion,
    nonGapConfirm: false
  }
}

/**
 * Journey overlay on RA-projected flags:
 * - trust RA offer_recommend (core strips it on A); FE only applies journey slot
 * - never invent offer_recommend when RA did not project it (no none／degraded 硬保)
 * - do not hide completion CTA because an older bank turn still has open gaps
 */
function applyPathCompletionOverlay(
  base: TurnActionsVisibility,
  input: {
    ctx: ChatTurnUiContext
    latest: boolean
    profileQuestionActive: boolean
    requiredProfileQuestionActive: boolean
    basicProfileComplete: boolean
  }
): TurnActionsVisibility {
  const { ctx } = input
  const slotOk = recommendCtaVisible({
    readonlyMode: ctx.readonlyMode,
    escalated: ctx.escalated,
    goalSelectActive: ctx.goalSelectActive,
    reportAskActive: ctx.reportAskActive,
    profileQuestionActive: input.profileQuestionActive,
    isLatestAssistant: input.latest,
    reportRetry: ctx.reportRetry,
    pending: ctx.pending,
    hasReportAnalysis: ctx.hasReportAnalysis,
    conversationPath: ctx.conversationPath ?? null,
    basicProfileComplete: input.basicProfileComplete,
    requiredProfileQuestionActive: input.requiredProfileQuestionActive,
    pathEntryPending: ctx.pathEntryPending
  })

  if (!slotOk) {
    return {
      ...base,
      showRecommend: false,
      showSubmitReview: false,
      showViewRecommend: false
    }
  }
  return base
}

function suppressGuidanceIfNeeded(
  visibility: TurnActionsVisibility,
  ctx: ChatTurnUiContext
): TurnActionsVisibility {
  if (!shouldSuppressGuidanceCtas({ labReportQuizActive: Boolean(ctx.labReportQuizActive) })) {
    return visibility
  }
  return {
    ...visibility,
    showUpload: false,
    showCheckup: false,
    showFullTest: false,
    showExpertBooking: false
  }
}

export function buildTurnActionsVisibility(input: {
  message: ChatMessage
  ctx: ChatTurnUiContext
  intake?: ChatMessage
  goalOptions: ChatMessageOption[]
  needsMultiConfirm: boolean
  expertReviewStatus?: ExpertReviewUiStatus
  /** `standard` skips expert-review submit and always offers「查看推薦方案」. */
  flow?: 'standard'
}): TurnActionsVisibility {
  const { message, ctx, intake, goalOptions, needsMultiConfirm } = input
  const expertReviewStatus = input.expertReviewStatus ?? 'none'
  const standardFlow = input.flow === 'standard'
  const latest = isLatestAssistantMessage(message, ctx.lastAssistantId)
  const basicProfileComplete = isBasicProfileComplete(ctx.openProfileGaps)
  const profileQuestionActive = message.turnType === 'profile' && Boolean(message.profileQuestion)
  const activeGapCode = message.profileQuestion?.gap_code
  // Only this bubble's required basics block completion CTA; older bank gaps do not.
  const requiredProfileQuestionActive = profileQuestionActive
    && isRequiredBasicGapCode(activeGapCode)
  const slotInput = {
    readonlyMode: ctx.readonlyMode,
    escalated: ctx.escalated,
    goalSelectActive: ctx.goalSelectActive,
    reportAskActive: ctx.reportAskActive,
    profileQuestionActive,
    isLatestAssistant: latest,
    reportRetry: ctx.reportRetry,
    pending: ctx.pending,
    hasReportAnalysis: ctx.hasReportAnalysis,
    expertReviewStatus,
    conversationPath: ctx.conversationPath ?? null,
    basicProfileComplete,
    requiredProfileQuestionActive,
    pathEntryPending: Boolean(ctx.pathEntryPending)
  }

  const overlay = (base: TurnActionsVisibility) => suppressGuidanceIfNeeded(
    applyPathCompletionOverlay(base, {
      ctx,
      latest,
      profileQuestionActive: slotInput.profileQuestionActive,
      requiredProfileQuestionActive: slotInput.requiredProfileQuestionActive,
      basicProfileComplete
    }),
    ctx
  )

  // Present RA column that is not usable (none / degraded / empty) → no CTAs.
  // ❌ Do not FE-synthesize completion CTA (Irice 更正).
  if (hasReplyActionsColumn(message.replyActions) && !isUsableReplyActions(message.replyActions)) {
    return emptyTurnActions(true)
  }

  if (isUsableReplyActions(message.replyActions)) {
    // Design B v3 / core #186：有 interaction 的歷史輪保留 CTA（selected／disabled）。
    // 舊後端無 interaction → 非最新仍不顯示（相容現況）。
    // 仍不把舊訊息未答題搬到最新一則（每則只投影自己的 RA）。
    const replyActions = message.replyActions!
    const retainHistorical = hasCtaInteractionMeta(replyActions)
    if (!latest && !retainHistorical) {
      return emptyTurnActions(true)
    }

    // Pending optional gaps must not steal completion CTA — core owns readiness.
    void basicProfileComplete
    const historicalRound = replyActions.interaction?.round_status === 'historical'
    // Historical rounds keep CTAs visible even when readonly／escalated (paint only).
    const canShowRecommendSlot = historicalRound
      ? Boolean(
          replyActions.actions.some(action => action.type === 'offer_recommend')
        )
      : recommendSlotVisible(slotInput)
    const guidanceSuppressed = shouldSuppressGuidanceCtas({
      labReportQuizActive: Boolean(ctx.labReportQuizActive)
    })
    const canShowUpload = historicalRound
      ? replyActions.actions.some(action => action.type === 'ask_report')
      : (!guidanceSuppressed
        && !ctx.readonlyMode
        && !ctx.escalated
        && !ctx.hasReportAnalysis
        && !(ctx.goalSelectActive && !ctx.hasReportAnalysis)
        && !ctx.pathEntryPending)
    const canShowCheckup = historicalRound
      ? replyActions.actions.some(action => action.type === 'offer_checkup')
      : (!guidanceSuppressed
        && !ctx.readonlyMode
        && !ctx.escalated
        && !ctx.pathEntryPending)
    const ownHasAskVitals = replyActions.actions.some(action => action.type === 'ask_vitals')
    // Historical vitals cards must paint even when the live turn is readonly.
    const canShowVitals = ownHasAskVitals && (
      historicalRound || (!ctx.readonlyMode && !ctx.escalated)
    )

    const own = projectGates({
      replyActions,
      canShowRecommendSlot,
      canShowUpload,
      canShowCheckup,
      canShowVitals,
      expertReviewStatus,
      standardFlow,
      checkupLinkReady: ctx.checkupLinkReady || historicalRound
    })

    const ownSplit = splitProjectionChoices(own.projection)
    // Each bubble: only this turn's gap＋non-gap chips (no lift from older bank).
    const choices = [...ownSplit.gapChoices, ...ownSplit.nonGapChoices]
    const showConfirm = (ownSplit.gapChoices.length > 0 && ownSplit.gapConfirm)
      || (ownSplit.nonGapChoices.length > 0 && ownSplit.nonGapConfirm)

    const visibility: TurnActionsVisibility = {
      choices,
      showConfirm,
      showUpload: own.projection.flags.showUpload,
      showCheckup: own.showCheckup,
      showFullTest: own.projection.flags.showFullTest
        && (historicalRound
          || (!ctx.readonlyMode && !ctx.escalated && !ctx.pathEntryPending)),
      showExpertBooking: own.projection.flags.showExpertBooking
        && (historicalRound
          || (!ctx.readonlyMode && !ctx.escalated && !ctx.pathEntryPending)),
      showWantMoreTests: false,
      showRecommend: own.projection.flags.showSubmitReview || own.projection.flags.showViewRecommend,
      showSubmitReview: own.projection.flags.showSubmitReview,
      showViewRecommend: own.projection.flags.showViewRecommend,
      showRetry: false,
      vitalsFields: own.projection.vitalsFields,
      vitalsGapCode: own.projection.vitalsGapCode,
      vitalsStatus: own.projection.vitalsStatus,
      vitalsHasStoredValue: own.projection.vitalsHasStoredValue,
      vitalsStoredValue: own.projection.vitalsStoredValue,
      confirmStatus: own.projection.confirmStatus,
      roundStatus: own.projection.roundStatus,
      checkupUrlOverride: own.projection.checkupUrlOverride,
      fullTestUrlOverride: own.projection.fullTestUrlOverride,
      fullTestLabelOverride: own.projection.fullTestLabelOverride,
      fullTestCopyOverride: own.projection.fullTestCopyOverride,
      fullTestMarkerCount: own.projection.fullTestMarkerCount,
      expertBookingPathOverride: own.projection.expertBookingPathOverride,
      expertBookingLabelOverride: own.projection.expertBookingLabelOverride,
      fromReplyActions: true,
      exclusiveCodes: own.projection.exclusiveCodes,
      replyProjection: own.projection
    }

    // Non-latest retained CTAs stay visible (design B) but must never stay
    // inputtable — coerce lingering `current` (hydrate／core lag) to historical.
    if (!latest) {
      return freezeNonLatestRetainedVisibility(visibility)
    }

    // Historical rounds skip journey overlays that would hide retained CTAs.
    if (historicalRound) {
      return visibility
    }
    return overlay(visibility)
  }

  // No reply_actions column: greeting / hydrate without RA may still show goal
  // or profile chips. Never invent recommend／upload／checkup from legacy meta.
  // Non-latest without RA: keep empty (same as pre-lift bank bubbles).
  if (!latest) {
    return emptyTurnActions(false)
  }

  const effectiveGoals = resolveEffectiveGoalOptions({
    goalSelectActive: ctx.goalSelectActive && !ctx.pathEntryPending,
    goalOptions,
    intake,
    message
  })
  const choices = ctx.pathEntryPending
    ? []
    : turnChoicesForMessage(
        message,
        intake,
        ctx.goalSelectActive,
        effectiveGoals
      )

  return overlay({
    choices,
    showConfirm: turnConfirmVisible(choices.length, needsMultiConfirm),
    showUpload: false,
    showCheckup: false,
    showFullTest: false,
    showExpertBooking: false,
    showWantMoreTests: false,
    showRecommend: false,
    showSubmitReview: false,
    showViewRecommend: false,
    showRetry: false,
    ...emptyReplyExtras()
  })
}
