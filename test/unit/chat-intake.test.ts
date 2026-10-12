import { describe, expect, it } from 'vitest'
import type { ChatMessage } from '../../app/utils/first-order'
import { findIntakeAssistantMessage, turnChoicesForMessage } from '../../app/utils/chat-intake'

const goals = [
  { code: 'sleep', label: '睡眠' },
  { code: 'weight', label: '減重' }
]

function assistant(id: string, extra: Partial<ChatMessage> = {}): ChatMessage {
  return {
    id,
    role: 'assistant',
    parts: [{ type: 'text', text: 'reply' }],
    ...extra
  }
}

describe('findIntakeAssistantMessage', () => {
  it('uses latest assistant during goal select even with wantMoreTestsOffer', () => {
    const interpret = assistant('interpret', {
      options: goals,
      wantMoreTestsOffer: true
    })
    const list = [assistant('greeting', { options: goals }), interpret]

    const intake = findIntakeAssistantMessage(list, {
      goalSelectActive: true,
      lastAssistantId: 'interpret'
    })

    expect(intake?.id).toBe('interpret')
    expect(
      turnChoicesForMessage(interpret, intake, true, goals).map(o => o.code)
    ).toEqual(['sleep', 'weight'])
  })
})
