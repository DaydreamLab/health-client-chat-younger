import { demoAssistantReply } from '../../app/utils/chat-demo'
import { isSupplementPlanId } from '../../app/utils/first-order'
import { isPlanId } from '../../app/utils/plans'

type ChatPart = { type: string, text?: string }

type IncomingMessage = {
  role?: string
  content?: string
  parts?: ChatPart[]
}

function lastUserText(messages: IncomingMessage[] = []) {
  const lastUser = [...messages].reverse().find(message => message.role === 'user')
  if (!lastUser) {
    return ''
  }

  if (typeof lastUser.content === 'string' && lastUser.content.trim()) {
    return lastUser.content.trim()
  }

  const textPart = lastUser.parts?.find(part => part.type === 'text' && part.text)
  return textPart?.text?.trim() || ''
}

export default defineEventHandler(async (event) => {
  const body = await readBody<{
    messages?: IncomingMessage[]
    plan?: string
    locale?: string
  }>(event)

  const question = lastUserText(body.messages)
  const plan = isSupplementPlanId(body.plan)
    ? body.plan
    : isPlanId(body.plan)
      ? body.plan
      : undefined

  return {
    id: crypto.randomUUID(),
    role: 'assistant' as const,
    parts: [{
      type: 'text' as const,
      text: demoAssistantReply({
        question,
        locale: body.locale,
        plan
      })
    }]
  }
})
