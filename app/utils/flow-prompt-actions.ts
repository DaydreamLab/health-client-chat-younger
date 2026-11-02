/**
 * Path C／B flow_prompt reply_actions helpers.
 * Core attach／create may return flow_prompt with usable RA; FE paints them,
 * then may stream a follow-up turn (e.g.「我的報告已上傳」). On success the
 * new assistant owns CTAs — clear the prior bubble so chips do not dual-host.
 * On stream failure keep the flow_prompt RA (caller discards the failed bubble).
 */

import type { ChatMessage } from './first-order'
import type { ReplyActions } from './reply-actions'
import { isUsableReplyActions } from './reply-actions'

/** Strip interactive CTAs from a prior flow_prompt／opening bubble. */
export function clearChatMessageActions(message: ChatMessage): void {
  message.replyActions = undefined
  message.options = []
  message.profileQuestion = null
  message.turnType = 'message'
  message.uploadOffer = false
  message.checkupOffer = false
  message.wantMoreTestsOffer = false
}

/**
 * After a failed follow-up stream, drop the error／empty assistant so the
 * flow_prompt host remains the latest assistant (buttons stay clickable).
 * Returns true when a bubble was removed.
 */
export function discardFailedFollowUpAssistant(
  messages: ChatMessage[],
  assistantId: string | null | undefined,
  flowHostId?: string | null
): boolean {
  if (!assistantId || assistantId === flowHostId) {
    return false
  }
  const idx = messages.findIndex(message => message.id === assistantId)
  if (idx < 0) {
    return false
  }
  messages.splice(idx, 1)
  return true
}

/** Whether a greeting／flow_prompt payload carries usable reply_actions. */
export function flowPromptHasUsableReplyActions(
  turn: { reply_actions?: ReplyActions | null } | null | undefined
): boolean {
  return isUsableReplyActions(turn?.reply_actions)
}
