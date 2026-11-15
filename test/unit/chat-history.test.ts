import { describe, expect, it } from 'vitest'
import {
  historyMessageToChatMessage,
  mergeServerHistoryWithLocalUserMessages,
  normalizeStoredChatMessage,
  normalizeStoredChatMessages,
  orderMessagesToChatMessages,
  parseConversationMessagesResult,
  parseHistoryMessage
} from '../../app/utils/chat-history'
import { buildOrderTranscriptTurnActions } from '../../app/utils/chat-turn-actions'
import { selectedCodesFromReplyActions } from '../../app/utils/cta-interaction'
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

describe('orderMessagesToChatMessages / order transcript CTAs', () => {
  const historicalPathSwitch = {
    schema_version: '0.1',
    source: 'path_entry',
    adaptor: 'fake',
    degraded: false,
    error: null,
    interaction: {
      round_status: 'historical',
      outcome: 'option_selected'
    },
    actions: [{
      type: 'choose_option',
      payload: {
        kind: 'path_switch',
        mode: 'single',
        confirm: false,
        options: [
          { code: 'a', label: '我想聊聊', status: 'disabled' },
          { code: 'b', label: '我想諮詢健康方案', status: 'selected' },
          { code: 'c', label: '幫我看報告', status: 'disabled' }
        ]
      }
    }]
  }

  it('maps GET /order/{id}/message reply_actions onto ChatMessage (same as history)', () => {
    const mapped = orderMessagesToChatMessages([
      {
        id: 'om-asst',
        role: 'assistant',
        content: '第一行\n\n第二行',
        reply_actions: historicalPathSwitch
      },
      { id: 'om-user', role: 'user', content: '我想諮詢健康方案' }
    ])
    expect(mapped).toHaveLength(2)
    expect(mapped[0]!.replyActions).toBeTruthy()
    expect(isUsableReplyActions(mapped[0]!.replyActions)).toBe(true)
    expect(mapped[0]!.parts[0]?.text).toBe('第一行\n\n第二行')
    expect(selectedCodesFromReplyActions(mapped[0]!.replyActions)).toEqual(['b'])
  })

  it('buildOrderTranscriptTurnActions keeps selected／disabled chips (paint-only)', () => {
    const messages = orderMessagesToChatMessages([
      {
        id: 'om-asst',
        role: 'assistant',
        content: '你想先從哪裡開始？',
        reply_actions: historicalPathSwitch
      },
      { id: 'om-user', role: 'user', content: '我想諮詢健康方案' }
    ])
    const visibility = buildOrderTranscriptTurnActions(messages[0]!, messages)
    expect(visibility.roundStatus).toBe('historical')
    expect(visibility.choices).toHaveLength(3)
    expect(visibility.choices.find(c => c.code === 'b')?.status).toBe('selected')
    expect(visibility.choices.find(c => c.code === 'a')?.status).toBe('disabled')
    expect(visibility.choices.find(c => c.code === 'c')?.status).toBe('disabled')
  })

  /**
   * Beta ORD-261115 shape: multi＋confirm with selected_codes only (no confirm_status).
   * Order transcript and /chat history must both paint confirm as selected.
   */
  const historicalMultiNoConfirmStatus = {
    schema_version: '0.1',
    source: 'rule',
    adaptor: 'fake',
    degraded: false,
    error: null,
    interaction: {
      round_status: 'historical',
      outcome: 'option_selected'
    },
    actions: [{
      type: 'choose_option',
      payload: {
        kind: 'consultation_goals',
        mode: 'multi',
        confirm: true,
        answer_type: 'multi_enum',
        options: [
          { code: 'sleep', label: '睡眠', status: 'selected' },
          { code: 'weight_loss', label: '減重', status: 'disabled' },
          { code: 'immune_boost', label: '免疫提升', status: 'disabled' },
          { code: 'cognitive_function', label: '認知功能', status: 'disabled' },
          { code: 'gastrointestinal', label: '腸胃道', status: 'disabled' }
        ],
        selected: ['sleep']
      }
    }]
  }

  const historicalSingleLab = {
    schema_version: '0.1',
    source: 'rule',
    adaptor: 'fake',
    degraded: false,
    error: null,
    interaction: {
      round_status: 'historical',
      outcome: 'option_selected'
    },
    actions: [{
      type: 'choose_option',
      payload: {
        kind: 'lab_report',
        mode: 'single',
        confirm: false,
        options: [
          { code: 'within_6m', label: '半年內', status: 'disabled' },
          { code: 'within_1y', label: '一年內', status: 'disabled' },
          { code: 'none', label: '無', status: 'selected' }
        ],
        selected: ['none']
      }
    }, {
      type: 'ask_report',
      payload: {}
    }]
  }

  const historicalVitals = {
    schema_version: '0.1',
    source: 'rule',
    adaptor: 'fake',
    degraded: false,
    error: null,
    interaction: {
      round_status: 'historical',
      outcome: 'option_selected'
    },
    actions: [{
      type: 'ask_vitals',
      payload: {
        fields: ['age'],
        gap_code: 'age',
        has_stored_value: true,
        stored_value: 35
        // status omitted — hydrate should stamp selected
      }
    }]
  }

  it('order＋/chat history: multi without confirm_status → confirm selected', () => {
    const orderMapped = orderMessagesToChatMessages([
      {
        id: 'om-goals',
        role: 'assistant',
        content: '優先改善方向？',
        reply_actions: historicalMultiNoConfirmStatus
      },
      { id: 'om-user-goals', role: 'user', content: '睡眠' }
    ])
    const orderVis = buildOrderTranscriptTurnActions(orderMapped[0]!, orderMapped)
    expect(orderVis.confirmStatus).toBe('selected')
    expect(orderVis.showConfirm).toBe(true)
    expect(orderVis.choices.find(c => c.code === 'sleep')?.status).toBe('selected')
    expect(orderVis.choices.find(c => c.code === 'weight_loss')?.status).toBe('disabled')

    const chatMapped = historyMessageToChatMessage(parseHistoryMessage({
      id: 'chat-goals',
      role: 'assistant',
      content: '優先改善方向？',
      reply_actions: historicalMultiNoConfirmStatus
    })!)
    const chatVis = buildTurnActionsVisibility({
      message: chatMapped,
      ctx: {
        readonlyMode: false,
        escalated: false,
        pending: false,
        goalSelectActive: false,
        reportAskActive: false,
        hasReportAnalysis: false,
        reportRetry: false,
        checkupLinkReady: true,
        lastAssistantId: 'later',
        conversationPath: 'B'
      },
      goalOptions: [],
      needsMultiConfirm: true
    })
    expect(chatVis.confirmStatus).toBe('selected')
    expect(chatVis.showConfirm).toBe(true)
    expect(chatVis.choices.find(c => c.code === 'sleep')?.status).toBe('selected')
  })

  it('CTA parity: single／vitals／upload align on order transcript and /chat history', () => {
    const singleOrder = orderMessagesToChatMessages([
      { id: 's1', role: 'assistant', content: '血檢？', reply_actions: historicalSingleLab },
      { id: 's2', role: 'user', content: '無' }
    ])
    const singleOrderVis = buildOrderTranscriptTurnActions(singleOrder[0]!, singleOrder)
    expect(singleOrderVis.showConfirm).toBe(false)
    expect(singleOrderVis.choices.find(c => c.code === 'none')?.status).toBe('selected')
    expect(singleOrderVis.choices.find(c => c.code === 'within_6m')?.status).toBe('disabled')
    expect(singleOrderVis.showUpload).toBe(true)

    const singleChat = historyMessageToChatMessage(parseHistoryMessage({
      id: 's1',
      role: 'assistant',
      content: '血檢？',
      reply_actions: historicalSingleLab
    })!)
    const singleChatVis = buildTurnActionsVisibility({
      message: singleChat,
      ctx: baseCtx({ lastAssistantId: 'later', conversationPath: 'B' }),
      goalOptions: [],
      needsMultiConfirm: false
    })
    expect(singleChatVis.showConfirm).toBe(false)
    expect(singleChatVis.choices.find(c => c.code === 'none')?.status).toBe('selected')
    expect(singleChatVis.showUpload).toBe(true)

    const vitalsOrder = orderMessagesToChatMessages([
      { id: 'v1', role: 'assistant', content: '年紀？', reply_actions: historicalVitals },
      { id: 'v2', role: 'user', content: '35' }
    ])
    const vitalsOrderVis = buildOrderTranscriptTurnActions(vitalsOrder[0]!, vitalsOrder)
    expect(vitalsOrderVis.vitalsStatus).toBe('selected')
    expect(vitalsOrderVis.vitalsHasStoredValue).toBe(true)
    expect(vitalsOrderVis.vitalsStoredValue).toBe(35)

    const vitalsChat = historyMessageToChatMessage(parseHistoryMessage({
      id: 'v1',
      role: 'assistant',
      content: '年紀？',
      reply_actions: historicalVitals
    })!)
    const vitalsChatVis = buildTurnActionsVisibility({
      message: vitalsChat,
      ctx: baseCtx({ lastAssistantId: 'later', conversationPath: 'B' }),
      goalOptions: [],
      needsMultiConfirm: false
    })
    expect(vitalsChatVis.vitalsStatus).toBe('selected')
    expect(vitalsChatVis.vitalsStoredValue).toBe(35)
  })

  it('omits reply_actions when API row has none (no invented CTAs)', () => {
    const mapped = orderMessagesToChatMessages([
      { id: 'plain', role: 'assistant', content: '純文字' }
    ])
    expect(mapped[0]!.replyActions).toBeUndefined()
    const visibility = buildOrderTranscriptTurnActions(mapped[0]!, mapped)
    expect(visibility.choices).toEqual([])
    expect(visibility.fromReplyActions).toBe(false)
  })

  /**
   * Beta ORD-261115-000001 shape: completion open-head still `current`
   * (cta_resolution never written after「查看推薦方案」navigate). Order modal
   * must still paint offer_recommend beside continue_consultation.
   */
  const openHeadCompletionCurrent = {
    schema_version: '0.1',
    source: 'semantic_judgment',
    adaptor: 'fake',
    degraded: false,
    error: null,
    interaction: {
      round_status: 'current' as const,
      outcome: null
    },
    actions: [
      {
        type: 'offer_recommend',
        payload: {
          mode: 'view_recommendations',
          label: '查看推薦方案',
          path: '/app/recommendations',
          status: 'current'
        }
      },
      {
        type: 'choose_option',
        payload: {
          kind: 'continue_consultation',
          mode: 'single',
          confirm: false,
          options: [
            { code: 'continue', label: '繼續健康諮詢', status: 'current' }
          ]
        }
      }
    ]
  }

  it('order transcript: open-head current completion still shows 查看推薦方案', () => {
    const mapped = orderMessagesToChatMessages([
      {
        id: 'om-complete',
        role: 'assistant',
        content: '如果去做一次檢查，之後可以更清楚各項指標。',
        reply_actions: openHeadCompletionCurrent
      },
      { id: 'om-user-reco', role: 'user', content: '查看推薦方案' },
      {
        id: 'om-asst-checkout',
        role: 'assistant',
        content: '方案已就緒，可前往結帳完成訂單。'
      },
      { id: 'om-user-checkout', role: 'user', content: '前往結帳' }
    ])
    expect(mapped).toHaveLength(4)
    expect(mapped.map(m => m.id)).toEqual([
      'om-complete',
      'om-user-reco',
      'om-asst-checkout',
      'om-user-checkout'
    ])

    const visibility = buildOrderTranscriptTurnActions(mapped[0]!, mapped)
    expect(visibility.showViewRecommend).toBe(true)
    expect(visibility.roundStatus).toBe('historical')
    const continueChip = visibility.choices.find(c => c.code === 'continue'
      || c.label === '繼續健康諮詢')
    expect(continueChip).toBeTruthy()
    expect(continueChip?.status).toBe('disabled')
  })

  /**
   * After core #197 backfill: cta_resolution.selected_action_types=["offer_recommend"]
   * → MessagePresenter stamps offer_recommend payload.status=selected.
   * Order transcript must paint selected (not blanket grey).
   */
  it('order transcript: offer_recommend selected stays selected after hydrate', () => {
    const mapped = orderMessagesToChatMessages([
      {
        id: 'om-complete-selected',
        role: 'assistant',
        content: '推薦輪已選過查看推薦方案。',
        reply_actions: {
          schema_version: '0.1',
          source: 'semantic_judgment',
          adaptor: 'rule',
          degraded: false,
          error: null,
          interaction: {
            round_status: 'historical',
            outcome: 'option_selected'
          },
          actions: [
            {
              type: 'offer_recommend',
              payload: {
                mode: 'view_recommendations',
                label: '查看推薦方案',
                path: '/app/recommendations',
                status: 'selected'
              }
            },
            {
              type: 'choose_option',
              payload: {
                kind: 'continue_consultation',
                mode: 'single',
                confirm: false,
                options: [
                  { code: 'continue', label: '繼續健康諮詢', status: 'disabled' }
                ]
              }
            }
          ]
        }
      }
    ])
    expect(
      (mapped[0]!.replyActions!.actions[0]!.payload as { status?: string }).status
    ).toBe('selected')

    const visibility = buildOrderTranscriptTurnActions(mapped[0]!, mapped)
    expect(visibility.showViewRecommend).toBe(true)
    expect(visibility.viewRecommendStatus).toBe('selected')
    expect(visibility.roundStatus).toBe('historical')
  })
})
