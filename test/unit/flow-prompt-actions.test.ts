import { describe, expect, it } from 'vitest'
import type { ChatMessage } from '../../app/utils/first-order'
import {
  clearChatMessageActions,
  discardFailedFollowUpAssistant,
  flowPromptHasUsableReplyActions
} from '../../app/utils/flow-prompt-actions'
import { buildTurnActionsVisibility } from '../../app/utils/chat-turn-actions'
import { historyMessageToChatMessage, parseHistoryMessage } from '../../app/utils/chat-history'
import { isUsableReplyActions } from '../../app/utils/reply-actions'

const goalsRa = {
  schema_version: '0.1',
  source: 'rule',
  adaptor: 'rule',
  degraded: false,
  error: null,
  actions: [
    {
      type: 'choose_option',
      payload: {
        kind: 'consultation_goals',
        mode: 'multi',
        confirm: true,
        options: [
          { code: 'sleep', label: '睡眠' },
          { code: 'weight_loss', label: '減重' }
        ],
        selected: [],
        gap_code: null,
        answer_type: 'multi_enum',
        exclusive_codes: []
      }
    }
  ]
}

const staleLabRa = {
  schema_version: '0.1',
  source: 'rule',
  adaptor: 'rule',
  degraded: false,
  error: null,
  actions: [
    {
      type: 'choose_option',
      payload: {
        kind: 'lab_followup',
        mode: 'single',
        confirm: false,
        options: [
          { code: 'upload_new', label: '上傳新報告', maps_to: 'ask_report' },
          { code: 'consult', label: '進行健康諮詢', maps_to: 'continue_consultation' },
          { code: 'checkup', label: '進行血檢', maps_to: 'offer_checkup' }
        ],
        selected: [],
        gap_code: null,
        answer_type: null,
        exclusive_codes: []
      }
    }
  ]
}

function baseCtx(lastId: string) {
  return {
    readonlyMode: false,
    escalated: false,
    pending: false,
    reportRetry: false,
    goalSelectActive: false,
    reportAskActive: false,
    profileQuestionActive: false,
    lastAssistantId: lastId,
    openProfileGaps: [] as string[],
    conversationPath: 'C' as const,
    pathEntryPending: false
  }
}

describe('flow-prompt-actions', () => {
  it('clearChatMessageActions strips RA／options so prior bubble cannot dual-host CTAs', () => {
    const message: ChatMessage = {
      id: 'flow-1',
      role: 'assistant',
      parts: [{ type: 'text', text: '報告收到了' }],
      replyActions: goalsRa as ChatMessage['replyActions'],
      options: [{ code: 'sleep', label: '睡眠' }],
      profileQuestion: { gap_code: 'sex', answer_type: 'enum' },
      uploadOffer: true
    }
    clearChatMessageActions(message)
    expect(message.replyActions).toBeUndefined()
    expect(message.options).toEqual([])
    expect(message.profileQuestion).toBeNull()
    expect(message.uploadOffer).toBe(false)
  })

  it('discardFailedFollowUpAssistant removes error bubble; keeps flow host id', () => {
    const messages: ChatMessage[] = [
      { id: 'flow-1', role: 'assistant', parts: [{ type: 'text', text: 'flow' }] },
      { id: 'user-1', role: 'user', parts: [{ type: 'text', text: '我的報告已上傳' }] },
      { id: 'err-1', role: 'assistant', parts: [{ type: 'text', text: 'stream error' }] }
    ]
    expect(discardFailedFollowUpAssistant(messages, 'err-1', 'flow-1')).toBe(true)
    expect(messages.map(m => m.id)).toEqual(['flow-1', 'user-1'])
    expect(discardFailedFollowUpAssistant(messages, 'flow-1', 'flow-1')).toBe(false)
  })

  it('flowPromptHasUsableReplyActions detects goals／stale lab RA', () => {
    expect(flowPromptHasUsableReplyActions({ reply_actions: goalsRa as never })).toBe(true)
    expect(flowPromptHasUsableReplyActions({ reply_actions: staleLabRa as never })).toBe(true)
    expect(flowPromptHasUsableReplyActions({ reply_actions: null })).toBe(false)
    expect(flowPromptHasUsableReplyActions(null)).toBe(false)
  })

  it('history flow_prompt／B opening with consultation_goals RA projects goal chips', () => {
    const row = parseHistoryMessage({
      id: 'b-open',
      role: 'assistant',
      content: '先選您想改善的健康方向。',
      reply_actions: goalsRa
    })
    expect(row).not.toBeNull()
    const message = historyMessageToChatMessage(row!)
    expect(isUsableReplyActions(message.replyActions)).toBe(true)
    const visibility = buildTurnActionsVisibility({
      message,
      ctx: baseCtx('b-open'),
      goalOptions: [],
      needsMultiConfirm: true
    })
    expect(visibility.fromReplyActions).toBe(true)
    expect(visibility.choices.map(c => c.code)).toEqual(['sleep', 'weight_loss'])
    expect(visibility.replyProjection?.chooseOption?.kind).toBe('consultation_goals')
  })

  it('history attach flow_prompt with stale lab_followup projects three triad chips', () => {
    const row = parseHistoryMessage({
      id: 'c-stale',
      role: 'assistant',
      content: '報告較舊',
      reply_actions: staleLabRa
    })
    const message = historyMessageToChatMessage(row!)
    const visibility = buildTurnActionsVisibility({
      message,
      ctx: { ...baseCtx('c-stale'), reportAskActive: true },
      goalOptions: [],
      needsMultiConfirm: false
    })
    expect(visibility.choices.map(c => c.label)).toEqual([
      '上傳新報告',
      '進行健康諮詢',
      '進行血檢'
    ])
  })
})
