import { describe, expect, it } from 'vitest'
import {
  historyMessageToChatMessage,
  mergeServerHistoryWithLocalUserMessages,
  normalizeStoredChatMessage,
  normalizeStoredChatMessages,
  parseConversationMessagesResult,
  parseHistoryMessage
} from '../../app/utils/chat-history'
import type { ChatMessage } from '../../app/utils/first-order'
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
    {
      type: 'offer_recommend',
      payload: {
        mode: 'view_recommendations',
        label: '查看推薦方案',
        path: '/app/recommendations'
      }
    },
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
    expect(parsed.path).toBeUndefined()
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
    expect(visibility.showSubmitReview).toBe(false)
    expect(visibility.showViewRecommend).toBe(true)
    expect(visibility.showUpload).toBe(true)
    // Dedupe: legacy options / checkup_offer ignored while reply_actions is usable.
    expect(visibility.choices).toEqual([])
    expect(visibility.showCheckup).toBe(false)
    expect(visibility.showWantMoreTests).toBe(false)
  })

  it('passes through optional conversation path on history payload', () => {
    const withPath = parseConversationMessagesResult({
      conversation_id: 'c1',
      path: 'b',
      messages: []
    })
    expect(withPath.path).toBe('b')
    const explicitNull = parseConversationMessagesResult({
      conversation_id: 'c1',
      path: null,
      messages: []
    })
    expect(explicitNull.path).toBeNull()
    // Missing key (pre-#139) must stay undefined so FE does not wipe local path.
    const missing = parseConversationMessagesResult({
      conversation_id: 'c1',
      messages: []
    })
    expect(missing.path).toBeUndefined()
  })

  it('guide_switch 422 realign: history path a + path_switch RA (chips follow core)', () => {
    const parsed = parseConversationMessagesResult({
      conversation_id: 'c1',
      path: 'a',
      messages: [{
        id: 'guide-1',
        role: 'assistant',
        content: '若想取得專屬保健品方案，可以繼續諮詢健康方案。',
        reply_actions: {
          schema_version: '0.1',
          source: 'rule',
          adaptor: 'rule',
          degraded: false,
          error: null,
          actions: [
            {
              type: 'choose_option',
              payload: {
                kind: 'path_switch',
                mode: 'single',
                confirm: false,
                options: [{ code: 'b', label: '' }],
                selected: [],
                gap_code: null,
                answer_type: null,
                exclusive_codes: []
              }
            }
          ]
        }
      }]
    })
    expect(parsed.path).toBe('a')
    const assistant = historyMessageToChatMessage(parsed.messages[0]!)
    expect(isUsableReplyActions(assistant.replyActions)).toBe(true)
    const visibility = buildTurnActionsVisibility({
      message: assistant,
      ctx: baseCtx({
        lastAssistantId: 'guide-1',
        conversationPath: 'A'
      }),
      goalOptions: [],
      needsMultiConfirm: false
    })
    expect(visibility.choices.some(c => c.code === 'b')).toBe(true)
    expect(visibility.choices.some(c => c.code === 'sleep')).toBe(false)
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

function textMsg(
  id: string,
  role: 'user' | 'assistant',
  text: string
): ChatMessage {
  return { id, role, parts: [{ type: 'text', text }] }
}

describe('mergeServerHistoryWithLocalUserMessages', () => {
  it('keeps path-C local-only user turns in order when server omits them', () => {
    const local = [
      textMsg('greet', 'assistant', '您好'),
      textMsg('local-path-c', 'user', '幫我看報告'),
      textMsg('local-upload', 'user', '已上傳 report.pdf'),
      textMsg('local-goals-asst', 'assistant', '本機舊 goals')
    ]
    const server = [
      textMsg('greet', 'assistant', '您好'),
      textMsg('srv-goals', 'assistant', '先選您想改善的健康方向。')
    ]
    const merged = mergeServerHistoryWithLocalUserMessages(local, server)
    expect(merged.map(m => m.id)).toEqual([
      'greet',
      'local-path-c',
      'local-upload',
      'srv-goals'
    ])
    expect(merged.map(m => m.parts[0]?.text)).toEqual([
      '您好',
      '幫我看報告',
      '已上傳 report.pdf',
      '先選您想改善的健康方向。'
    ])
  })

  it('dedupes by trimmed text when core later persists the same user turns', () => {
    const local = [
      textMsg('greet', 'assistant', '您好'),
      textMsg('local-path-c', 'user', '幫我看報告'),
      textMsg('local-upload', 'user', '已上傳 report.pdf'),
      textMsg('local-extra', 'user', '還想問睡眠')
    ]
    const server = [
      textMsg('greet', 'assistant', '您好'),
      textMsg('srv-path-c', 'user', '幫我看報告'),
      textMsg('srv-upload', 'user', '已上傳 report.pdf'),
      textMsg('srv-goals', 'assistant', '先選方向')
    ]
    const merged = mergeServerHistoryWithLocalUserMessages(local, server)
    expect(merged.map(m => m.id)).toEqual([
      'greet',
      'srv-path-c',
      'srv-upload',
      'local-extra',
      'srv-goals'
    ])
    const pathCCount = merged.filter(
      m => m.role === 'user' && m.parts[0]?.text === '幫我看報告'
    ).length
    const uploadCount = merged.filter(
      m => m.role === 'user' && m.parts[0]?.text === '已上傳 report.pdf'
    ).length
    expect(pathCCount).toBe(1)
    expect(uploadCount).toBe(1)
  })

  it('dedupes by id when local and server share the same user id', () => {
    const local = [
      textMsg('greet', 'assistant', '您好'),
      textMsg('u-shared', 'user', '幫我看報告'),
      textMsg('u-only', 'user', '已上傳 a.pdf')
    ]
    const server = [
      textMsg('greet', 'assistant', '您好'),
      textMsg('u-shared', 'user', '幫我看報告'),
      textMsg('a1', 'assistant', '收到')
    ]
    const merged = mergeServerHistoryWithLocalUserMessages(local, server)
    expect(merged.map(m => m.id)).toEqual(['greet', 'u-shared', 'u-only', 'a1'])
  })
})
