import type { ChatMessage, ChatMessageOption } from './first-order'
import { turnChoicesForMessage } from './chat-intake'
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
 * Intake 三要件（皆必問、report 不進 gap）：
 * 1. 問卷 profile gaps  2. report（ask_report，類 goal）  3. goals
 *
 * 三要件齊後流程：基本回應 → CTA 判讀（systemone／catalog）→ **完成 CTA**；
 * FE 依 usable `reply_actions` 決定畫哪些按鈕（upload／checkup／recommend…）。
 * ❌ 非固定硬掛「提交專家判讀」；intentional `none`／degraded／無 RA＝不畫怪鈕。
 *
 * Legacy meta (`upload_offer` / journey-invented recommend) is **not** a fallback.
 * Greeting goal chips may still use `goalSelectActive` + options when greeting
 * has no RA column.
 *
 * | Journey / bubble | Goal／chips | 完成 CTA（依 RA） | 上傳／健檢 |
 * |------------------|-------------|-------------------|------------|
 * | 開場選目標 / report 必問 / open gap | 該則 | 否（要件未齊） | ask_report 時 |
 * | usable RA after 三要件 | — | 依 actions 投影 | ask_report |
 * | intentional none / degraded | 否 | 否 | 否 |
 */

export interface ChatTurnUiContext {
  readonlyMode: boolean
  escalated: boolean
  pending: boolean
  goalSelectActive: boolean
  /**
   * Required ask for report (mirrors goalSelectActive). Driven by usable
   * `ask_report` — blocks recommend until analysis / cleared by later RA.
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
 * `offer_recommend` (part of **完成 CTA** after CTA 判讀). Never invents
 * buttons alone — callers must still require usable `offer_recommend`.
 *
 * Blocks while any of the three intake requirements is still active:
 * goals / report ask / open profile gap (profileQuestionActive | pending gap).
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
}): boolean {
  // 三要件未齊：不進入完成 CTA 的 recommend 槽（繪製仍看 usable offer_recommend）。
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
  reportInterpretSent: boolean
  promptMode: boolean
}

export interface ReportDockBarVisibility {
  showExplainHighlights: boolean
  showWantMoreTestsLink: boolean
}

/** Top report dock bar — same gates as bubble TurnActions where applicable. */
export function reportDockBarVisibility(input: ReportDockBarInput): ReportDockBarVisibility {
  const { ctx, profileQuestionActive, reportInterpretSent, promptMode } = input
  if (promptMode) {
    return {
      showExplainHighlights: false,
      showWantMoreTestsLink: false
    }
  }
  const baseBlocked = ctx.readonlyMode || ctx.escalated || ctx.pending || ctx.reportRetry
  const showExplainHighlights = ctx.hasReportAnalysis
    && !baseBlocked
    && !profileQuestionActive
    && !ctx.goalSelectActive
    && !ctx.reportAskActive
    && !reportInterpretSent
  const showWantMoreTestsLink = ctx.hasReportAnalysis
    && !ctx.readonlyMode
    && !ctx.escalated
    && !ctx.pending
    && ctx.checkupLinkReady
  return {
    showExplainHighlights,
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
  // lab_report chips (transition): required-ask surface, not profile-gap host.
  if (choose.gap_code === 'lab_report') {
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
  const gapHostId = ctx.gapCtaHostId
  const isGapHost = gapHostId !== undefined && message.id === gapHostId
  const pendingGapBehindLatest = Boolean(
    gapHostId
    && ctx.lastAssistantId
    && gapHostId !== ctx.lastAssistantId
  )
  // Lift open gap CTAs onto the latest bubble so users are not stuck staring at
  // a covering stream turn while chips/vitals sit on an older bank message.
  const renderGapOnThis = pendingGapBehindLatest ? latest : isGapHost
  const profileQuestionActive = message.turnType === 'profile' && Boolean(message.profileQuestion)
  const slotInput = {
    readonlyMode: ctx.readonlyMode,
    escalated: ctx.escalated,
    goalSelectActive: ctx.goalSelectActive,
    reportAskActive: ctx.reportAskActive,
    // Treat an open gap behind latest like an active profile question so
    // offer_recommend on the covering stream turn does not steal the CTA slot.
    profileQuestionActive: profileQuestionActive || (pendingGapBehindLatest && latest),
    isLatestAssistant: latest,
    reportRetry: ctx.reportRetry,
    pending: ctx.pending,
    hasReportAnalysis: ctx.hasReportAnalysis,
    expertReviewStatus
  }

  // Present RA column that is not usable (none / degraded / empty) → no CTAs.
  if (hasReplyActionsColumn(message.replyActions) && !isUsableReplyActions(message.replyActions)) {
    return emptyTurnActions(true)
  }

  if (isUsableReplyActions(message.replyActions)) {
    // Bank host behind latest: CTAs are lifted — leave the old bubble empty.
    if (pendingGapBehindLatest && isGapHost && !latest) {
      return emptyTurnActions(true)
    }

    const canShowRecommendSlot = recommendSlotVisible(slotInput)
      && !pendingGapBehindLatest
    const canShowUpload = latest
      && !pendingGapBehindLatest
      && !ctx.readonlyMode
      && !ctx.escalated
      && !ctx.hasReportAnalysis
      && !(ctx.goalSelectActive && !ctx.hasReportAnalysis)
    const canShowCheckup = latest
      && !pendingGapBehindLatest
      && !ctx.readonlyMode
      && !ctx.escalated
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

    return {
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
    }
  }

  // No reply_actions column: greeting / hydrate without RA may still show goal
  // or profile chips. Never invent recommend / upload / checkup from legacy meta.
  const effectiveGoals = resolveEffectiveGoalOptions({
    goalSelectActive: ctx.goalSelectActive,
    goalOptions,
    intake,
    message
  })
  const choices = turnChoicesForMessage(
    message,
    intake,
    ctx.goalSelectActive,
    effectiveGoals
  )

  return {
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
  }
}
