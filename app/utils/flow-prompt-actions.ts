/**
 * Path C／B flow_prompt reply_actions helpers.
 * Core attach／create may return flow_prompt with usable RA; FE paints them,
 * then may stream a follow-up turn (e.g.「我的報告已上傳」). On success the
 * new assistant owns CTAs — clear the prior bubble so chips do not dual-host.
 * On stream failure keep the error bubble with a retry tip (run15); do not
 * silently discard so the user never sees a vanished reply.
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
 * After a failed follow-up stream, keep the error／empty assistant bubble
 * (run15: never silently remove) and strip any CTAs so only the error tip
 * + retry affordance show. Returns true when the failed bubble was marked.
 */
export function keepFailedFollowUpAssistant(
  messages: ChatMessage[],
  assistantId: string | null | undefined,
  flowHostId?: string | null
): boolean {
  if (!assistantId || assistantId === flowHostId) {
    return false
  }
  const message = messages.find(item => item.id === assistantId)
  if (!message) {
    return false
  }
  clearChatMessageActions(message)
  message.streamFailed = true
  return true
}

/**
 * @deprecated run15: prefer {@link keepFailedFollowUpAssistant}. Kept as a
 * thin alias so older call sites／tests migrate without silent discard.
 */
export function discardFailedFollowUpAssistant(
  messages: ChatMessage[],
  assistantId: string | null | undefined,
  flowHostId?: string | null
): boolean {
  return keepFailedFollowUpAssistant(messages, assistantId, flowHostId)
}

/** Whether a greeting／flow_prompt payload carries usable reply_actions. */
export function flowPromptHasUsableReplyActions(
  turn: { reply_actions?: ReplyActions | null } | null | undefined
): boolean {
  return isUsableReplyActions(turn?.reply_actions)
}
