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

export function isLatestAssistantMessage(
  message: ChatMessage,
  lastAssistantId?: string
): boolean {
  return message.role === 'assistant'
    && lastAssistantId !== undefined
    && message.id === lastAssistantId
}

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
  if (
    recommendCtaVisible({
      readonlyMode: ctx.readonlyMode,
      escalated: ctx.escalated,
      goalSelectActive: ctx.goalSelectActive,
      profileQuestionActive: message.turnType === 'profile' && Boolean(message.profileQuestion),
      isLatestAssistant: latest,
      reportRetry: ctx.reportRetry,
      pending: ctx.pending,
      hasReportAnalysis: ctx.hasReportAnalysis
    })
  ) {
    return true
  }
  return latest && Boolean(message.wantMoreTestsOffer)
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
  showRecommend: boolean
  showRetry: boolean
}

export function buildTurnActionsVisibility(input: {
  message: ChatMessage
  ctx: ChatTurnUiContext
  intake?: ChatMessage
  goalOptions: ChatMessageOption[]
  needsMultiConfirm: boolean
}): TurnActionsVisibility {
  const { message, ctx, intake, goalOptions, needsMultiConfirm } = input
  const choices = turnChoicesForMessage(
    message,
    intake,
    ctx.goalSelectActive,
    goalOptions
  )
  const latest = isLatestAssistantMessage(message, ctx.lastAssistantId)
  const profileQuestionActive = message.turnType === 'profile' && Boolean(message.profileQuestion)

  return {
    choices,
    showConfirm: turnConfirmVisible(choices.length, needsMultiConfirm),
    showUpload: uploadCtaVisible(ctx, message),
    showCheckup: checkupCtaVisible(ctx, message),
    showWantMoreTests: wantMoreTestsCtaVisible(ctx, message),
    showRecommend: recommendCtaVisible({
      readonlyMode: ctx.readonlyMode,
      escalated: ctx.escalated,
      goalSelectActive: ctx.goalSelectActive,
      profileQuestionActive,
      isLatestAssistant: latest,
      reportRetry: ctx.reportRetry,
      pending: ctx.pending,
      hasReportAnalysis: ctx.hasReportAnalysis
    }),
    showRetry: retryCtaVisible()
  }
}
