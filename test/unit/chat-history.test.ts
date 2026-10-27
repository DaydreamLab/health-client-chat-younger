import { describe, expect, it } from 'vitest'
import {
  historyMessageToChatMessage,
  normalizeStoredChatMessage,
  normalizeStoredChatMessages,
  parseConversationMessagesResult,
  parseHistoryMessage
} from '../../app/utils/chat-history'
import {
  buildTurnActionsVisibility,
  type ChatTurnUiContext
} from '../../app/utils/chat-turn-actions'
import { isUsableReplyActions } from '../../app/utils/reply-actions'

const usableReplyActions = {
  schema_version: '0.1',
  source: 'semantic_judgment',
  adaptor: 'fake',
  degraded: false,
  error: null,
  actions: [
    { type: 'offer_recommend', payload: {} },
    { type: 'ask_report', payload: {} }
  ]
}

function baseCtx(overrides: Partial<ChatTurnUiContext> = {}): ChatTurnUiContext {
  return {
    readonlyMode: false,
    escalated: false,
    pending: false,
    goalSelectActive: false,
    reportAskActive: false,
    hasReportAnalysis: false,
    reportRetry: false,
    checkupLinkReady: true,
    lastAssistantId: 'a1',
    ...overrides
  }
}

describe('parseConversationMessagesResult / historyMessageToChatMessage', () => {
  it('maps history reply_actions onto ChatMessage for the same CTA path as SSE', () => {
    const parsed = parseConversationMessagesResult({
      conversation_id: 'c1',
      messages: [
        { id: 'u1', role: 'user', content: '你好' },
        {
          message_id: 'a1',
          role: 'assistant',
          content: '可提交判讀',
          options: [{ code: 'legacy', label: '舊選項' }],
          upload_offer: true,
          checkup_offer: true,
          reply_actions: usableReplyActions
        }
      ]
    })
    expect(parsed.messages).toHaveLength(2)
    const assistant = historyMessageToChatMessage(parsed.messages[1]!)
    expect(assistant.id).toBe('a1')
    expect(isUsableReplyActions(assistant.replyActions)).toBe(true)
    expect(assistant.uploadOffer).toBe(true)
    expect(assistant.checkupOffer).toBe(true)

    const visibility = buildTurnActionsVisibility({
      message: assistant,
      ctx: baseCtx({ lastAssistantId: 'a1' }),
      goalOptions: [],
      needsMultiConfirm: false,
      expertReviewStatus: 'none'
    })
    expect(visibility.fromReplyActions).toBe(true)
    expect(visibility.showSubmitReview).toBe(true)
    expect(visibility.showUpload).toBe(true)
    // Dedupe: legacy options / checkup_offer ignored while reply_actions is usable.
    expect(visibility.choices).toEqual([])
    expect(visibility.showCheckup).toBe(false)
    expect(visibility.showWantMoreTests).toBe(false)
  })

  it('degraded / missing reply_actions do not fall back to legacy upload', () => {
    const degraded = historyMessageToChatMessage(parseHistoryMessage({
      id: 'a1',
      role: 'assistant',
      content: '上傳吧',
      upload_offer: true,
      reply_actions: {
        schema_version: '0.1',
        degraded: true,
        actions: [{ type: 'none' }]
      }
    })!)
    expect(isUsableReplyActions(degraded.replyActions)).toBe(false)
    const degradedVis = buildTurnActionsVisibility({
      message: degraded,
      ctx: baseCtx(),
      goalOptions: [],
      needsMultiConfirm: false
    })
    expect(degradedVis.fromReplyActions).toBe(true)
    expect(degradedVis.showUpload).toBe(false)
    expect(degradedVis.showSubmitReview).toBe(false)

    const absent = historyMessageToChatMessage(parseHistoryMessage({
      id: 'a2',
      role: 'assistant',
      content: '上傳吧',
      upload_offer: true
    })!)
    expect(absent.replyActions).toBeUndefined()
    expect(
      buildTurnActionsVisibility({
        message: { ...absent, id: 'a1' },
        ctx: baseCtx(),
        goalOptions: [],
        needsMultiConfirm: false
      }).showUpload
    ).toBe(false)
  })

  it('accepts bare messages array payload', () => {
    const parsed = parseConversationMessagesResult([
      { id: 'u1', role: 'user', content: 'hi' }
    ])
    expect(parsed.messages).toHaveLength(1)
    expect(parsed.messages[0]?.role).toBe('user')
  })
})

describe('normalizeStoredChatMessages', () => {
  it('re-parses snake_case reply_actions from stored journey snapshots', () => {
    const normalized = normalizeStoredChatMessage({
      id: 'a1',
      role: 'assistant',
      parts: [{ type: 'text', text: 'hello' }],
      uploadOffer: true,
      reply_actions: usableReplyActions
    })
    expect(normalized?.replyActions?.actions[0]?.type).toBe('offer_recommend')
    expect(
      buildTurnActionsVisibility({
        message: normalized!,
        ctx: baseCtx(),
        goalOptions: [],
        needsMultiConfirm: false,
        expertReviewStatus: 'none'
      }).fromReplyActions
    ).toBe(true)
  })

  it('drops invalid rows without breaking the list', () => {
    expect(normalizeStoredChatMessages([
      null,
      { id: 'u1', role: 'user', parts: [{ type: 'text', text: 'x' }] },
      { role: 'assistant' }
    ]).map(m => m.id)).toEqual(['u1'])
  })
})
