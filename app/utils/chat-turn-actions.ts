import type { ChatMessage, ChatMessageOption } from './first-order'
import { turnChoicesForMessage } from './chat-intake'
import {
  completionCtaVisible,
  isBasicProfileComplete,
  isRequiredBasicGapCode,
  shouldSuppressGuidanceCtas,
  type ConversationPath
} from './path-contract'
import {
  hasReplyActionsColumn,
  isUsableReplyActions,
  NON_GAP_CHOOSE_OPTION_KINDS,
  projectReplyActionsToCtas,
  type ChooseOptionPayload,
  type ReplyActions,
  type ReplyActionsCtaProjection,
  type VitalsField
} from './reply-actions'

/**
 * Chat bubble TurnActions visibility rules (single source of truth).
 *
 * Path contract (Irice)：
 * - 完成 CTA 僅 path B／C + 基本四欄（sex／age／height／weight）齊；A 永不顯示。
 * - goals／報告／optional profile 不挡完成 CTA（舊 triad 全清 profile 拿掉）。
 * - 完成 CTA 仍依 usable `offer_recommend` 投影；❌ 不在 none／degraded／缺 RA 時 FE 強掛。
 * - upload／checkup 只走 usable RA；lab_report 問卷進行中不預掛。
 *
 * Legacy meta (`upload_offer` / journey-invented recommend) is **not** a fallback.
 * Path-null（legacy／未選進站）keeps prior RA-only recommend rules.
 *
 * | Journey / bubble | Goal／chips | 完成 CTA | 上傳／健檢 |
 * |------------------|-------------|---------|------------|
 * | path A | 可 | 永不 | RA only |
 * | path B／C + 基本齊 + usable offer_recommend | 可（不挡） | 是 | RA；lab_report 進行中否 |
 * | intentional none／degraded | — | 否（不強掛） | 否 |
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
   * Assistant message that **owns** the open profile-gap CTA payload
   * (ask_vitals / profile choose_option). May be behind lastAssistantId when
   * the latest stream turn only carries offer_* / free chips / ask_report.
   * UI paints those gap CTAs on the **latest** bubble (lift), not only on bank.
   */
  gapCtaHostId?: string
  /** reply_actions from the gap host message (for lifting onto latest). */
  gapCtaHostReplyActions?: ReplyActions | null
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
 * Path-aware (when `conversationPath` is B／C):
 * - goals／reportAsk 不挡；僅基本四欄未齊或 required profile question 挡。
 * - Path A：永遠 false（即使 RA 有 offer_recommend）。
 *
 * Path-null（legacy）：保留舊三要件（goals／report／profile question 挡），
 * 且仍須由呼叫端搭配 usable `offer_recommend`（本函式不發明按鈕）。
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
  if (input.pathEntryPending) {
    return false
  }
  const path = input.conversationPath ?? null
  if (path === 'A') {
    return false
  }
  if (path === 'B' || path === 'C') {
    return completionCtaVisible({
      path,
      basicProfileComplete: input.basicProfileComplete === true,
      readonlyMode: input.readonlyMode,
      escalated: input.escalated,
      isLatestAssistant: input.isLatestAssistant,
      reportRetry: input.reportRetry,
      pending: input.pending,
      requiredProfileQuestionActive: input.requiredProfileQuestionActive
        ?? input.profileQuestionActive
    })
  }
  // Legacy path-null: goals／report／profile question still block.
  const goalsBlockRecommend = input.goalSelectActive
  const reportBlockRecommend = Boolean(input.reportAskActive)
  return !input.readonlyMode
    && !input.escalated
    && !goalsBlockRecommend
    && !reportBlockRecommend
    && !input.profileQuestionActive
    && input.isLatestAssistant
    && !input.reportRetry
    && !input.pending
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
  showWantMoreTests: boolean
  /** @deprecated Prefer showSubmitReview / showViewRecommend */
  showRecommend: boolean
  showSubmitReview: boolean
  showViewRecommend: boolean
  showRetry: boolean
  /** ask_vitals numeric fields (reply_actions path only). */
  vitalsFields: VitalsField[]
  vitalsGapCode: string | null
  /** offer_checkup payload.url when set; else use journey default. */
  checkupUrlOverride: string | null
  /** True when CTAs come from reply_actions column (usable or intentional empty). */
  fromReplyActions: boolean
  /** Exclusive chip codes when choose_option drives selection. */
  exclusiveCodes: string[]
  replyProjection: ReplyActionsCtaProjection | null
}

function emptyReplyExtras(): Pick<
  TurnActionsVisibility,
  'vitalsFields' | 'vitalsGapCode' | 'checkupUrlOverride' | 'fromReplyActions' | 'exclusiveCodes' | 'replyProjection'
> {
  return {
    vitalsFields: [],
    vitalsGapCode: null,
    checkupUrlOverride: null,
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

/** Split gap-bound choices from free / lab_followup / consultation_goals / lab_report. */
function splitProjectionChoices(projection: ReplyActionsCtaProjection): {
  gapChoices: ChatMessageOption[]
  gapConfirm: boolean
  nonGapChoices: ChatMessageOption[]
  nonGapConfirm: boolean
} {
  const choose = projection.chooseOption
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
      nonGapChoices: [],
      nonGapConfirm: false
    }
  }
  if (isNonGapChoosePayload(choose)) {
    return {
      gapChoices: [],
      gapConfirm: false,
      nonGapChoices: projection.flags.choices,
      nonGapConfirm: projection.flags.showConfirm
    }
  }
  return {
    gapChoices: projection.flags.choices,
    gapConfirm: projection.flags.showConfirm,
    nonGapChoices: [],
    nonGapConfirm: false
  }
}

/**
 * Path overlay on RA-projected flags:
 * - A: always strip completion CTA
 * - B／C: keep completion CTA only when threshold + journey allow
 * - never invent offer_recommend when RA did not project it (no none／degraded 硬保)
 */
function applyPathCompletionOverlay(
  base: TurnActionsVisibility,
  input: {
    ctx: ChatTurnUiContext
    latest: boolean
    pendingGapBehindLatest: boolean
    profileQuestionActive: boolean
    requiredProfileQuestionActive: boolean
    basicProfileComplete: boolean
  }
): TurnActionsVisibility {
  const { ctx } = input
  const path = ctx.conversationPath ?? null
  if (path === 'A') {
    return {
      ...base,
      showRecommend: false,
      showSubmitReview: false,
      showViewRecommend: false
    }
  }

  if (path !== 'B' && path !== 'C') {
    return base
  }

  // Path B／C: only required-basic gaps behind latest block; optional gaps do not.
  const pendingGapBlocksRecommend = input.pendingGapBehindLatest
    && !input.basicProfileComplete
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
    conversationPath: path,
    basicProfileComplete: input.basicProfileComplete,
    requiredProfileQuestionActive: input.requiredProfileQuestionActive,
    pathEntryPending: ctx.pathEntryPending
  }) && !pendingGapBlocksRecommend

  if (!slotOk) {
    return {
      ...base,
      showRecommend: false,
      showSubmitReview: false,
      showViewRecommend: false
    }
  }
  // slotOk: keep RA projection as-is（含「沒有 offer_recommend → 不顯示」）.
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
    showCheckup: false
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
  // When no open profile-gap host is found, the latest assistant still hosts its
  // own ask_vitals / chips (openProfileGaps may be empty on a covering stream).
  const gapHostId = ctx.gapCtaHostId ?? ctx.lastAssistantId
  const isGapHost = gapHostId !== undefined && message.id === gapHostId
  const pendingGapBehindLatest = Boolean(
    ctx.gapCtaHostId
    && ctx.lastAssistantId
    && ctx.gapCtaHostId !== ctx.lastAssistantId
  )
  // Lift open gap CTAs onto the latest bubble so users are not stuck staring at
  // a covering stream turn while chips/vitals sit on an older bank message.
  const renderGapOnThis = pendingGapBehindLatest ? latest : isGapHost
  const profileQuestionActive = message.turnType === 'profile' && Boolean(message.profileQuestion)
  const activeGapCode = message.profileQuestion?.gap_code
  // Only required basics block completion CTA; optional (e.g. diet) do not.
  const requiredProfileQuestionActive = (
    profileQuestionActive && isRequiredBasicGapCode(activeGapCode)
  ) || (pendingGapBehindLatest && latest && !basicProfileComplete)
  const slotInput = {
    readonlyMode: ctx.readonlyMode,
    escalated: ctx.escalated,
    goalSelectActive: ctx.goalSelectActive,
    reportAskActive: ctx.reportAskActive,
    // Legacy path-null still treats any profile／pending gap as blocking.
    // Path B／C uses requiredProfileQuestionActive instead (optional 不挡).
    profileQuestionActive: profileQuestionActive || (pendingGapBehindLatest && latest),
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
      pendingGapBehindLatest,
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
    // Bank host behind latest: CTAs are lifted — leave the old bubble empty.
    if (pendingGapBehindLatest && isGapHost && !latest) {
      return emptyTurnActions(true)
    }

    const path = ctx.conversationPath ?? null
    // Path B／C: optional gap behind latest must not steal completion CTA slot.
    const pendingGapBlocksRecommend = path === 'B' || path === 'C'
      ? (pendingGapBehindLatest && !basicProfileComplete)
      : pendingGapBehindLatest
    const canShowRecommendSlot = recommendSlotVisible(slotInput)
      && !pendingGapBlocksRecommend
    const guidanceSuppressed = shouldSuppressGuidanceCtas({
      labReportQuizActive: Boolean(ctx.labReportQuizActive)
    })
    const canShowUpload = latest
      && !pendingGapBehindLatest
      && !guidanceSuppressed
      && !ctx.readonlyMode
      && !ctx.escalated
      && !ctx.hasReportAnalysis
      && !(ctx.goalSelectActive && !ctx.hasReportAnalysis)
      && !ctx.pathEntryPending
    const canShowCheckup = latest
      && !pendingGapBehindLatest
      && !guidanceSuppressed
      && !ctx.readonlyMode
      && !ctx.escalated
      && !ctx.pathEntryPending
    const canShowOwnVitals = renderGapOnThis && !ctx.readonlyMode && !ctx.escalated

    const own = projectGates({
      replyActions: message.replyActions!,
      canShowRecommendSlot,
      canShowUpload,
      canShowCheckup,
      canShowVitals: canShowOwnVitals && isGapHost,
      expertReviewStatus,
      standardFlow,
      checkupLinkReady: ctx.checkupLinkReady
    })

    let gapChoices: ChatMessageOption[] = []
    let gapConfirm = false
    let vitalsFields: VitalsField[] = []
    let vitalsGapCode: string | null = null
    let gapExclusive = own.projection.exclusiveCodes

    if (renderGapOnThis) {
      if (pendingGapBehindLatest && ctx.gapCtaHostReplyActions
        && isUsableReplyActions(ctx.gapCtaHostReplyActions)) {
        const lifted = projectGates({
          replyActions: ctx.gapCtaHostReplyActions,
          canShowRecommendSlot: false,
          canShowUpload: false,
          canShowCheckup: false,
          canShowVitals: !ctx.readonlyMode && !ctx.escalated,
          expertReviewStatus,
          standardFlow,
          checkupLinkReady: ctx.checkupLinkReady
        })
        const split = splitProjectionChoices(lifted.projection)
        gapChoices = split.gapChoices
        gapConfirm = split.gapConfirm
        vitalsFields = lifted.projection.vitalsFields
        vitalsGapCode = lifted.projection.vitalsGapCode
        if (split.gapChoices.length) {
          gapExclusive = lifted.projection.exclusiveCodes
        }
      } else if (isGapHost) {
        const split = splitProjectionChoices(own.projection)
        gapChoices = split.gapChoices
        gapConfirm = split.gapConfirm
        vitalsFields = own.projection.vitalsFields
        vitalsGapCode = own.projection.vitalsGapCode
      }
    }

    const ownSplit = splitProjectionChoices(own.projection)
    // Free / lab_followup / ask_goal / lab_report chips stay on the message that
    // carries them when it is the latest bubble (even if a bank gap is open).
    const nonGapChoices = latest ? ownSplit.nonGapChoices : []
    const nonGapConfirm = latest ? ownSplit.nonGapConfirm : false

    // Latest may show lifted gap chips alongside free / required-ask chips.
    const choices = [...gapChoices, ...nonGapChoices]
    const showConfirm = (gapChoices.length > 0 && gapConfirm)
      || (nonGapChoices.length > 0 && nonGapConfirm)
    const exclusiveCodes = nonGapChoices.length
      ? own.projection.exclusiveCodes
      : gapExclusive

    return overlay({
      choices,
      showConfirm,
      showUpload: own.projection.flags.showUpload,
      showCheckup: own.showCheckup,
      showWantMoreTests: false,
      showRecommend: own.projection.flags.showSubmitReview || own.projection.flags.showViewRecommend,
      showSubmitReview: own.projection.flags.showSubmitReview,
      showViewRecommend: own.projection.flags.showViewRecommend,
      showRetry: false,
      vitalsFields,
      vitalsGapCode,
      checkupUrlOverride: own.projection.checkupUrlOverride,
      fromReplyActions: true,
      exclusiveCodes,
      replyProjection: own.projection
    })
  }

  // No reply_actions column: greeting / hydrate without RA may still show goal
  // or profile chips. Never invent recommend／upload／checkup from legacy meta.
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
    showWantMoreTests: false,
    showRecommend: false,
    showSubmitReview: false,
    showViewRecommend: false,
    showRetry: false,
    ...emptyReplyExtras()
  })
}
