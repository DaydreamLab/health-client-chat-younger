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

  it('finds offer_recommend + continue_chat host once options are applied', () => {
    // applyReplyActionsInteraction must write message.options for primary continue_chat
    // so intake resolves to that bubble (not an older free／profile turn).
    const tips = assistant('asst-sleep-tips', {
      options: [{ code: 'continue_chat', label: '繼續聊聊' }]
    })
    const list = [
      assistant('asst-free', {
        options: [
          { code: 'opt_1', label: '是，現在開始' },
          { code: 'opt_3', label: '我想先了解睡眠改善的一般建議' }
        ]
      }),
      tips
    ]
    const intake = findIntakeAssistantMessage(list, {
      goalSelectActive: false,
      lastAssistantId: 'asst-sleep-tips'
    })
    expect(intake?.id).toBe('asst-sleep-tips')
    expect(turnChoicesForMessage(tips, intake, false, []).map(o => o.code)).toEqual([
      'continue_chat'
    ])
  })

  it('misses continue_chat host when options were never written', () => {
    const tips = assistant('asst-sleep-tips', { options: [] })
    const older = assistant('asst-free', {
      options: [{ code: 'opt_3', label: '我想先了解睡眠改善的一般建議' }]
    })
    const intake = findIntakeAssistantMessage([older, tips], {
      goalSelectActive: false,
      lastAssistantId: 'asst-sleep-tips'
    })
    expect(intake?.id).toBe('asst-free')
  })
})
