import { describe, expect, it, beforeEach } from 'vitest'
import {
  findGapCtaHostMessage,
  hasUsableGapCta,
  isUsableReplyActions,
  offerRecommendLabelKey,
  parseReplyActions,
  projectReplyActionsToCtas,
  resetReplyActionsUnknownLog,
  type ReplyActions
} from '../../app/utils/reply-actions'
import {
  buildTurnActionsVisibility,
  type ChatTurnUiContext
} from '../../app/utils/chat-turn-actions'
import type { ChatMessage } from '../../app/utils/first-order'

function ra(partial: Partial<ReplyActions> & { actions: ReplyActions['actions'] }): ReplyActions {
  return {
    schema_version: '0.1',
    source: 'semantic_judgment',
    adaptor: 'llm',
    degraded: false,
    error: null,
    ...partial
  }
}

function assistant(id: string, extra: Partial<ChatMessage> = {}): ChatMessage {
  return {
    id,
    role: 'assistant',
    parts: [{ type: 'text', text: 'hello' }],
    ...extra
  }
}

function baseCtx(overrides: Partial<ChatTurnUiContext> = {}): ChatTurnUiContext {
  return {
    readonlyMode: false,
    escalated: false,
    pending: false,
    goalSelectActive: false,
    hasReportAnalysis: false,
    reportRetry: false,
    checkupLinkReady: true,
    lastAssistantId: 'latest',
    ...overrides
  }
}

describe('parseReplyActions / isUsableReplyActions', () => {
  beforeEach(() => {
    resetReplyActionsUnknownLog()
  })

  it('returns null for missing/invalid payloads', () => {
    expect(parseReplyActions(undefined)).toBeNull()
    expect(parseReplyActions(null)).toBeNull()
    expect(parseReplyActions('x')).toBeNull()
  })

  it('parses schema v0.1 shape', () => {
    const parsed = parseReplyActions({
      schema_version: '0.1',
      source: 'semantic_judgment',
      adaptor: 'llm',
      actions: [{ type: 'ask_report', payload: {} }],
      degraded: false,
      error: null
    })
    expect(parsed?.actions).toEqual([{ type: 'ask_report', payload: {} }])
    expect(isUsableReplyActions(parsed)).toBe(true)
  })

  it('treats degraded / empty / none-only as not usable', () => {
    expect(isUsableReplyActions(ra({ degraded: true, actions: [{ type: 'ask_report' }] }))).toBe(false)
    expect(isUsableReplyActions(ra({ actions: [] }))).toBe(false)
    expect(isUsableReplyActions(ra({ actions: [{ type: 'none' }] }))).toBe(false)
  })

  it('hasUsableGapCta requires ask_vitals / choose_option / ask_goal (not offer_*)', () => {
    expect(hasUsableGapCta(ra({ actions: [{ type: 'offer_recommend' }] }))).toBe(false)
    expect(hasUsableGapCta(ra({ actions: [{ type: 'ask_report' }, { type: 'offer_checkup' }] }))).toBe(false)
    expect(hasUsableGapCta(ra({
      actions: [
        { type: 'offer_recommend' },
        { type: 'ask_vitals', payload: { fields: ['height'] } }
      ]
    }))).toBe(true)
    expect(hasUsableGapCta(ra({
      actions: [{
        type: 'choose_option',
        payload: { kind: 'profile', gap_code: 'sex', options: [{ code: 'F', label: '女' }] }
      }]
    }))).toBe(true)
    expect(hasUsableGapCta(ra({ degraded: true, actions: [{ type: 'ask_vitals' }] }))).toBe(false)
  })

  it('findGapCtaHostMessage walks past offer_recommend-only latest to bank ask_vitals', () => {
    const bank = assistant('bank', {
      replyActions: ra({
        actions: [{ type: 'ask_vitals', payload: { fields: ['height'], gap_code: 'height' } }]
      })
    })
    const stream = assistant('stream', {
      replyActions: ra({ actions: [{ type: 'offer_recommend' }] })
    })
    expect(findGapCtaHostMessage([bank, stream])?.id).toBe('bank')
    expect(findGapCtaHostMessage([stream])?.id).toBeUndefined()
    expect(findGapCtaHostMessage([
      bank,
      assistant('later', {
        replyActions: ra({
          actions: [{ type: 'ask_vitals', payload: { fields: ['weight'] } }]
        })
      })
    ])?.id).toBe('later')
  })

  it('ignores unknown types for usability; keeps known siblings', () => {
    const parsed = ra({
      actions: [
        { type: 'future_thing', payload: {} },
        { type: 'offer_checkup', payload: { url: 'https://example.com/check' } }
      ]
    })
    expect(isUsableReplyActions(parsed)).toBe(true)
    const projection = projectReplyActionsToCtas({
      replyActions: parsed,
      canShowRecommendSlot: true,
      canShowUpload: true,
      canShowCheckup: true,
      canShowVitals: true,
      expertReviewStatus: 'none'
    })
    expect(projection.flags.showCheckup).toBe(true)
    expect(projection.checkupUrlOverride).toBe('https://example.com/check')
  })
})

describe('projectReplyActionsToCtas', () => {
  it('maps choose_option chips + confirm', () => {
    const projection = projectReplyActionsToCtas({
      replyActions: ra({
        actions: [{
          type: 'choose_option',
          payload: {
            kind: 'consultation_goals',
            mode: 'multi',
            confirm: true,
            options: [
              { code: 'sleep', label: '睡眠' },
              { code: 'weight_loss', label: '減重' }
            ]
          }
        }]
      }),
      canShowRecommendSlot: true,
      canShowUpload: true,
      canShowCheckup: true,
      canShowVitals: true,
      expertReviewStatus: 'none'
    })
    expect(projection.flags.choices.map(c => c.code)).toEqual(['sleep', 'weight_loss'])
    expect(projection.flags.showConfirm).toBe(true)
  })

  it('ask_goal yields goal chips unless choose_option consultation_goals present', () => {
    const alone = projectReplyActionsToCtas({
      replyActions: ra({
        actions: [{ type: 'ask_goal', payload: { goal_codes: ['sleep', 'weight_loss'] } }]
      }),
      canShowRecommendSlot: false,
      canShowUpload: false,
      canShowCheckup: false,
      canShowVitals: false,
      expertReviewStatus: 'none'
    })
    expect(alone.flags.choices.length).toBeGreaterThanOrEqual(2)
    expect(alone.flags.showConfirm).toBe(true)

    const withChoose = projectReplyActionsToCtas({
      replyActions: ra({
        actions: [
          { type: 'ask_goal', payload: { goal_codes: ['sleep'] } },
          {
            type: 'choose_option',
            payload: {
              kind: 'consultation_goals',
              mode: 'multi',
              confirm: true,
              options: [
                { code: 'sleep', label: '睡眠' },
                { code: 'weight_loss', label: '減重' }
              ]
            }
          }
        ]
      }),
      canShowRecommendSlot: false,
      canShowUpload: false,
      canShowCheckup: false,
      canShowVitals: false,
      expertReviewStatus: 'none'
    })
    expect(withChoose.askGoal).toBeNull()
    expect(withChoose.flags.choices.map(c => c.code)).toEqual(['sleep', 'weight_loss'])
  })

  it('offer_recommend copy path differs by flow (submit vs view)', () => {
    expect(offerRecommendLabelKey(undefined)).toBe('chat.submitExpertReview')
    expect(offerRecommendLabelKey('standard')).toBe('chat.viewRecommend')

    const expert = projectReplyActionsToCtas({
      replyActions: ra({ actions: [{ type: 'offer_recommend' }] }),
      canShowRecommendSlot: true,
      canShowUpload: false,
      canShowCheckup: false,
      canShowVitals: false,
      expertReviewStatus: 'none'
    })
    expect(expert.flags.showSubmitReview).toBe(true)
    expect(expert.flags.showViewRecommend).toBe(false)

    const standard = projectReplyActionsToCtas({
      replyActions: ra({ actions: [{ type: 'offer_recommend' }] }),
      canShowRecommendSlot: true,
      canShowUpload: false,
      canShowCheckup: false,
      canShowVitals: false,
      expertReviewStatus: 'none',
      flow: 'standard'
    })
    expect(standard.flags.showSubmitReview).toBe(false)
    expect(standard.flags.showViewRecommend).toBe(true)
  })

  it('ask_vitals projects fields; ask_report / offer_checkup map to upload / checkup', () => {
    const projection = projectReplyActionsToCtas({
      replyActions: ra({
        actions: [
          { type: 'ask_vitals', payload: { fields: ['age', 'weight'], gap_code: 'age' } },
          { type: 'ask_report' },
          { type: 'offer_checkup', payload: { url: 'https://labs.example/x' } }
        ]
      }),
      canShowRecommendSlot: true,
      canShowUpload: true,
      canShowCheckup: true,
      canShowVitals: true,
      expertReviewStatus: 'none'
    })
    expect(projection.vitalsFields).toEqual(['age', 'weight'])
    expect(projection.vitalsGapCode).toBe('age')
    expect(projection.flags.showUpload).toBe(true)
    expect(projection.flags.showCheckup).toBe(true)
    expect(projection.checkupUrlOverride).toBe('https://labs.example/x')
  })
})

describe('buildTurnActionsVisibility — reply_actions dedupe vs legacy', () => {
  it('usable reply_actions hides legacy options/upload/checkup/want-more', () => {
    const msg = assistant('latest', {
      options: [{ code: 'legacy', label: 'legacy chip' }],
      uploadOffer: true,
      checkupOffer: true,
      wantMoreTestsOffer: true,
      replyActions: ra({
        actions: [
          { type: 'ask_report' },
          { type: 'offer_recommend' }
        ]
      })
    })
    const v = buildTurnActionsVisibility({
      message: msg,
      ctx: baseCtx({ lastAssistantId: 'latest' }),
      goalOptions: [],
      needsMultiConfirm: false,
      expertReviewStatus: 'none'
    })
    expect(v.fromReplyActions).toBe(true)
    expect(v.choices).toEqual([])
    expect(v.showUpload).toBe(true)
    expect(v.showCheckup).toBe(false)
    expect(v.showWantMoreTests).toBe(false)
    expect(v.showSubmitReview).toBe(true)
    expect(v.showViewRecommend).toBe(false)
  })

  it('degraded / empty reply_actions falls back to legacy meta', () => {
    const degraded = assistant('latest', {
      uploadOffer: true,
      replyActions: ra({ degraded: true, actions: [{ type: 'ask_report' }] })
    })
    const empty = assistant('latest', {
      uploadOffer: true,
      replyActions: ra({ actions: [{ type: 'none' }] })
    })
    for (const msg of [degraded, empty]) {
      const v = buildTurnActionsVisibility({
        message: msg,
        ctx: baseCtx({ lastAssistantId: 'latest' }),
        goalOptions: [],
        needsMultiConfirm: false
      })
      expect(v.fromReplyActions).toBe(false)
      expect(v.showUpload).toBe(true)
    }
  })

  it('absent reply_actions keeps legacy recommend / chips behavior', () => {
    const msg = assistant('latest', {
      options: [
        { code: 'sleep', label: '睡眠' },
        { code: 'weight', label: '減重' }
      ],
      turnType: 'profile',
      profileQuestion: { gap_code: 'diet', answer_type: 'enum' }
    })
    const v = buildTurnActionsVisibility({
      message: msg,
      ctx: baseCtx({ lastAssistantId: 'latest' }),
      intake: msg,
      goalOptions: [],
      needsMultiConfirm: false
    })
    expect(v.fromReplyActions).toBe(false)
    expect(v.choices.map(c => c.code)).toEqual(['sleep', 'weight'])
    expect(v.showRecommend).toBe(false)
  })

  it('/chat-ai standard flow shows view-recommend for offer_recommend', () => {
    const msg = assistant('latest', {
      replyActions: ra({ actions: [{ type: 'offer_recommend' }] })
    })
    const v = buildTurnActionsVisibility({
      message: msg,
      ctx: baseCtx({ hasReportAnalysis: true, lastAssistantId: 'latest' }),
      goalOptions: [],
      needsMultiConfirm: false,
      expertReviewStatus: 'none',
      flow: 'standard'
    })
    expect(v.showSubmitReview).toBe(false)
    expect(v.showViewRecommend).toBe(true)
  })

  it('readonly hides vitals; pending keeps vitals card for submitting state', () => {
    const msg = assistant('latest', {
      replyActions: ra({
        actions: [
          { type: 'offer_recommend' },
          { type: 'ask_vitals', payload: { fields: ['age'] } }
        ]
      })
    })
    const pending = buildTurnActionsVisibility({
      message: msg,
      ctx: baseCtx({
        pending: true,
        hasReportAnalysis: true,
        lastAssistantId: 'latest',
        gapCtaHostId: 'latest'
      }),
      goalOptions: [],
      needsMultiConfirm: false,
      expertReviewStatus: 'none',
      flow: 'standard'
    })
    expect(pending.showViewRecommend).toBe(false)
    // Card stays mounted so AskVitalsCard can show「送出中」; keys disabled via pending prop.
    expect(pending.vitalsFields).toEqual(['age'])

    const readonly = buildTurnActionsVisibility({
      message: msg,
      ctx: baseCtx({
        readonlyMode: true,
        hasReportAnalysis: true,
        lastAssistantId: 'latest',
        gapCtaHostId: 'latest'
      }),
      goalOptions: [],
      needsMultiConfirm: false,
      expertReviewStatus: 'none',
      flow: 'standard'
    })
    expect(readonly.showViewRecommend).toBe(false)
    expect(readonly.vitalsFields).toEqual([])
  })

  it('gap CTA fallback: ask_vitals on bank host when latest is offer_recommend-only', () => {
    const bank = assistant('bank', {
      replyActions: ra({
        actions: [{ type: 'ask_vitals', payload: { fields: ['height'], gap_code: 'height' } }]
      })
    })
    const stream = assistant('stream', {
      replyActions: ra({ actions: [{ type: 'offer_recommend' }, { type: 'ask_report' }] })
    })
    const ctx = baseCtx({
      lastAssistantId: 'stream',
      gapCtaHostId: 'bank',
      hasReportAnalysis: true
    })
    const onBank = buildTurnActionsVisibility({
      message: bank,
      ctx,
      goalOptions: [],
      needsMultiConfirm: false,
      expertReviewStatus: 'none',
      flow: 'standard'
    })
    expect(onBank.vitalsFields).toEqual(['height'])
    expect(onBank.vitalsGapCode).toBe('height')
    expect(onBank.showViewRecommend).toBe(false)

    const onStream = buildTurnActionsVisibility({
      message: stream,
      ctx,
      goalOptions: [],
      needsMultiConfirm: false,
      expertReviewStatus: 'none',
      flow: 'standard'
    })
    expect(onStream.vitalsFields).toEqual([])
    // Pending gap behind latest suppresses recommend/upload on the covering turn.
    expect(onStream.showViewRecommend).toBe(false)
    expect(onStream.showUpload).toBe(false)
  })

  it('choose_option sex chips stay on bank host when stream covers with offer_recommend', () => {
    const bank = assistant('bank', {
      replyActions: ra({
        actions: [{
          type: 'choose_option',
          payload: {
            kind: 'profile',
            mode: 'single',
            gap_code: 'sex',
            answer_type: 'enum',
            options: [
              { code: 'M', label: '男' },
              { code: 'F', label: '女' }
            ]
          }
        }]
      })
    })
    const stream = assistant('stream', {
      replyActions: ra({ actions: [{ type: 'offer_recommend' }] })
    })
    const ctx = baseCtx({ lastAssistantId: 'stream', gapCtaHostId: 'bank' })
    const onBank = buildTurnActionsVisibility({
      message: bank,
      ctx,
      goalOptions: [],
      needsMultiConfirm: false
    })
    expect(onBank.choices.map(c => c.code)).toEqual(['M', 'F'])
    const onStream = buildTurnActionsVisibility({
      message: stream,
      ctx,
      goalOptions: [],
      needsMultiConfirm: false
    })
    expect(onStream.choices).toEqual([])
    expect(onStream.showSubmitReview).toBe(false)
  })
})
