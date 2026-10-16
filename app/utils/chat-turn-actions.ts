import type { ChatMessage, ChatMessageOption } from './first-order'
import { turnChoicesForMessage } from './chat-intake'

/**
 * Chat bubble TurnActions visibility rules (single source of truth).
 *
 * | Journey / bubble | Goal chips + confirm | 查看推薦方案 | 我想檢查更多 | 上傳 | 健檢外連 |
 * |------------------|----------------------|--------------|--------------|------|----------|
 * | 開場選目標 (goalSelect, 無報告) | intake 最新助理 | 否 | 否 | 否 | 該則 checkupOffer |
 * | 問卷 profile 題 (quiz) | intake 上 options | 否（該則為 profile） | 否 | 最新 + upload_offer | 該則 checkupOffer |
 * | 判讀後補選目標 (goalSelect + hasAnalysis) | 最新助理 + goalOptions | 最新助理 | 最新助理 | 否 | 該則 checkupOffer |
 * | 自由對話 / 釐清後 | 否（除非再次 goalSelect） | 最新助理 | 最新且 recommend 或 wantMoreTestsOffer | 同上 | 該則 checkupOffer |
 * | standard（/chat-ai） | 同上 | 推薦槽一律「查看推薦方案」，不看專家狀態、不提交判讀 | 同上 | 同上 | 同上 |
 * | pending / readonly / escalated | 照舊但 CTA 多數禁用或隱藏 | 否 | 否 | 否 | 否（readonly/escalated） |
 * | 非最新助理 bubble | 否 | 否 | 否（不因舊 wantMoreTestsOffer） | 否 | 該則若有 checkupOffer |
 */

export interface ChatTurnUiContext {
  readonlyMode: boolean
  escalated: boolean
  pending: boolean
  goalSelectActive: boolean
  hasReportAnalysis: boolean
  reportRetry: boolean
  /** individual_tests_url resolved and non-empty */
  checkupLinkReady: boolean
  lastAssistantId?: string
}

const LAB_GAP_CODES = new Set(['lab_report', 'checkup', 'blood_test'])

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

export function recommendCtaVisible(input: {
  readonlyMode: boolean
  escalated: boolean
  goalSelectActive: boolean
  profileQuestionActive: boolean
  isLatestAssistant: boolean
  reportRetry: boolean
  pending?: boolean
  hasReportAnalysis?: boolean
}): boolean {
  const goalsBlockRecommend = input.goalSelectActive && !input.hasReportAnalysis
  return !input.readonlyMode
    && !input.escalated
    && !goalsBlockRecommend
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

export function uploadCtaVisible(
  ctx: ChatTurnUiContext,
  message: ChatMessage
): boolean {
  if (!isLatestAssistantMessage(message, ctx.lastAssistantId)) {
    return false
  }
  if (ctx.readonlyMode || ctx.escalated || ctx.hasReportAnalysis) {
    return false
  }
  if (ctx.goalSelectActive) {
    return false
  }
  if (
    message.turnType === 'profile'
    && message.profileQuestion
    && LAB_GAP_CODES.has(message.profileQuestion.gap_code)
  ) {
    return false
  }
  return message.uploadOffer === true
}

/** Persists on the assistant turn that carried checkup_offer from the stream. */
export function checkupCtaVisible(
  ctx: ChatTurnUiContext,
  message: ChatMessage
): boolean {
  if (message.role !== 'assistant' || !message.checkupOffer) {
    return false
  }
  if (ctx.readonlyMode || ctx.escalated) {
    return false
  }
  return ctx.checkupLinkReady
}

/** External link only; does not gate「查看推薦方案」. */
export function wantMoreTestsCtaVisible(
  ctx: ChatTurnUiContext,
  message: ChatMessage
): boolean {
  if (message.role !== 'assistant' || ctx.readonlyMode || ctx.escalated) {
    return false
  }
  if (!ctx.checkupLinkReady) {
    return false
  }
  const latest = isLatestAssistantMessage(message, ctx.lastAssistantId)
  if (!latest) {
    return false
  }
  const profileQuestionActive = message.turnType === 'profile' && Boolean(message.profileQuestion)
  if (
    recommendCtaVisible({
      readonlyMode: ctx.readonlyMode,
      escalated: ctx.escalated,
      goalSelectActive: ctx.goalSelectActive,
      profileQuestionActive,
      isLatestAssistant: true,
      reportRetry: ctx.reportRetry,
      pending: ctx.pending,
      hasReportAnalysis: ctx.hasReportAnalysis
    })
  ) {
    return true
  }
  return Boolean(message.wantMoreTestsOffer)
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
    && !(ctx.goalSelectActive && !ctx.hasReportAnalysis)
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
  const latest = isLatestAssistantMessage(message, ctx.lastAssistantId)
  const profileQuestionActive = message.turnType === 'profile' && Boolean(message.profileQuestion)
  const slotInput = {
    readonlyMode: ctx.readonlyMode,
    escalated: ctx.escalated,
    goalSelectActive: ctx.goalSelectActive,
    profileQuestionActive,
    isLatestAssistant: latest,
    reportRetry: ctx.reportRetry,
    pending: ctx.pending,
    hasReportAnalysis: ctx.hasReportAnalysis,
    expertReviewStatus
  }
  const showSubmitReview = standardFlow ? false : submitExpertReviewCtaVisible(slotInput)
  const showViewRecommend = standardFlow
    ? standardViewRecommendCtaVisible(slotInput)
    : viewRecommendCtaVisible(slotInput)

  return {
    choices,
    showConfirm: turnConfirmVisible(choices.length, needsMultiConfirm),
    showUpload: uploadCtaVisible(ctx, message),
    showCheckup: checkupCtaVisible(ctx, message),
    showWantMoreTests: wantMoreTestsCtaVisible(ctx, message),
    showRecommend: showSubmitReview || showViewRecommend,
    showSubmitReview,
    showViewRecommend,
    showRetry: retryCtaVisible()
  }
}
