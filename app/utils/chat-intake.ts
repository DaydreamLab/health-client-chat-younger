import type { ChatMessage, ChatMessageOption } from './first-order'

export function findIntakeAssistantMessage(
  list: ChatMessage[],
  params: { goalSelectActive: boolean, lastAssistantId?: string }
): ChatMessage | undefined {
  if (params.goalSelectActive) {
    if (params.lastAssistantId) {
      const last = list.find(m => m.id === params.lastAssistantId)
      if (last?.role === 'assistant' && !last.notice) {
        return last
      }
    }
    return [...list].reverse().find(message =>
      message.role === 'assistant'
      && !message.notice
      && !message.uploadOffer
      && !message.checkupOffer
    )
  }
  return [...list].reverse().find(message =>
    message.role === 'assistant'
    && !message.notice
    && (Boolean(message.options?.length) || Boolean(message.profileQuestion))
  )
}

export function turnChoicesForMessage(
  message: ChatMessage,
  intake: ChatMessage | undefined,
  goalSelectActive: boolean,
  goalOptions: ChatMessageOption[]
): ChatMessageOption[] {
  if (!intake || message.id !== intake.id) {
    return []
  }
  if (goalSelectActive) {
    return goalOptions
  }
  return intake.options ?? []
}
