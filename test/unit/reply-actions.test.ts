import { describe, expect, it, beforeEach } from 'vitest'
import {
  detectPathRuleCopyKind,
  findGapCtaHostMessage,
  hasLabReportBankOrFollowup,
  hasReportRequiredAsk,
  hasUsableGapCta,
  isPathSwitchOptionCode,
  isUsableReplyActions,
  normalizeChooseOptionMapsTo,
  offerRecommendLabelKey,
  parseReplyActions,
  pathRuleBubbleI18nKey,
  pathSwitchChipI18nKey,
  projectReplyActionsToCtas,
  resetReplyActionsUnknownLog,
  shouldSkipFollowUpStream,
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
    reportAskActive: false,
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

  it('hasUsableGapCta requires ask_vitals / profile choose_option (not offer_* / ask_report / ask_goal / lab_report)', () => {
    expect(hasUsableGapCta(ra({ actions: [{ type: 'offer_recommend' }] }))).toBe(false)
    expect(hasUsableGapCta(ra({ actions: [{ type: 'ask_report' }, { type: 'offer_checkup' }] }))).toBe(false)
    expect(hasUsableGapCta(ra({ actions: [{ type: 'ask_goal', payload: { goal_codes: ['sleep'] } }] }))).toBe(false)
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

  it('hasUsableGapCta never treats lab_report / lab_followup as profile gap (report 必問)', () => {
    const answeredLab = ra({
      actions: [{
        type: 'choose_option',
        payload: {
          kind: 'profile',
          gap_code: 'lab_report',
          answer_type: 'enum',
          options: [{ code: 'none', label: '無' }]
        }
      }]
    })
    // Report 不進 gap：即使 open gaps 仍含 lab_report 也不當 gap host。
    expect(hasUsableGapCta(answeredLab)).toBe(false)
    expect(hasUsableGapCta(answeredLab, [])).toBe(false)
    expect(hasUsableGapCta(answeredLab, ['lab_report'])).toBe(false)

    // core #100: kind=lab_report（同 ask_goal 模式）
    const kindLab = ra({
      actions: [{
        type: 'choose_option',
        payload: {
          kind: 'lab_report',
          mode: 'single',
          gap_code: 'lab_report',
          options: [{ code: 'none', label: '無' }]
        }
      }]
    })
    expect(hasUsableGapCta(kindLab, ['lab_report'])).toBe(false)
    expect(hasReportRequiredAsk(kindLab)).toBe(true)
    expect(hasReportRequiredAsk(ra({ actions: [{ type: 'ask_report' }] }))).toBe(true)
    expect(hasReportRequiredAsk(ra({ actions: [{ type: 'offer_recommend' }] }))).toBe(false)

    const followup = ra({
      actions: [{
        type: 'choose_option',
        payload: {
          kind: 'lab_followup',
          mode: 'single',
          options: [
            { code: 'upload', label: '上傳報告', maps_to: 'ask_report' },
            { code: 'checkup', label: '我想檢查', maps_to: 'offer_checkup' }
          ]
        }
      }]
    })
    expect(hasUsableGapCta(followup, [])).toBe(false)
    expect(hasUsableGapCta(followup, ['lab_report'])).toBe(false)
  })

  it('shouldSkipFollowUpStream skips lab_report bank／lab_followup; streams over stale profile lab', () => {
    const staleAnsweredLab = assistant('bank-lab-stale', {
      replyActions: ra({
        actions: [{
          type: 'choose_option',
          payload: {
            kind: 'profile',
            gap_code: 'lab_report',
            options: [{ code: 'none', label: '無' }]
          }
        }]
      })
    })
    // Stale answered shape — must NOT skip (P0: still need stream when bank was not rewritten).
    expect(hasLabReportBankOrFollowup(staleAnsweredLab.replyActions)).toBe(false)
    expect(shouldSkipFollowUpStream({
      nextQuestionDone: true,
      openProfileGaps: [],
      messages: [staleAnsweredLab]
    })).toBe(false)
    expect(shouldSkipFollowUpStream({
      nextQuestionDone: false,
      openProfileGaps: [],
      messages: [staleAnsweredLab]
    })).toBe(false)

    const labBank = assistant('bank-lab', {
      replyActions: ra({
        actions: [
          { type: 'ask_report', payload: { option_codes: ['none', 'within_1y'] } },
          {
            type: 'choose_option',
            payload: {
              kind: 'lab_report',
              gap_code: 'lab_report',
              options: [{ code: 'none', label: '無' }]
            }
          }
        ]
      })
    })
    expect(hasLabReportBankOrFollowup(labBank.replyActions)).toBe(true)
    expect(shouldSkipFollowUpStream({
      nextQuestionDone: false,
      openProfileGaps: ['diet'],
      messages: [labBank]
    })).toBe(true)

    const followup = assistant('bank-followup', {
      replyActions: ra({
        actions: [{
          type: 'choose_option',
          payload: {
            kind: 'lab_followup',
            options: [
              { code: 'upload', label: '上傳報告', maps_to: 'ask_report' },
              { code: 'checkup', label: '我想檢查', maps_to: 'offer_checkup' }
            ]
          }
        }]
      })
    })
    expect(shouldSkipFollowUpStream({
      nextQuestionDone: true,
      openProfileGaps: [],
      messages: [followup]
    })).toBe(true)

    // Still-open sex gap on history → skip covering stream (hybrid).
    const sexBank = assistant('bank-sex', {
      replyActions: ra({
        actions: [{
          type: 'choose_option',
          payload: {
            kind: 'profile',
            gap_code: 'sex',
            options: [{ code: 'F', label: '女' }]
          }
        }]
      })
    })
    expect(shouldSkipFollowUpStream({
      nextQuestionDone: false,
      openProfileGaps: ['sex', 'age'],
      messages: [sexBank]
    })).toBe(true)
  })

  it('normalizeChooseOptionMapsTo accepts catalog aliases', () => {
    expect(normalizeChooseOptionMapsTo('ask_report')).toBe('ask_report')
    expect(normalizeChooseOptionMapsTo('offer_checkup')).toBe('offer_checkup')
    expect(normalizeChooseOptionMapsTo('upload')).toBe('ask_report')
    expect(normalizeChooseOptionMapsTo('go_checkup')).toBe('offer_checkup')
    expect(normalizeChooseOptionMapsTo('free_text')).toBeNull()
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
    // Answered lab bank is ignored when open gaps empty.
    const labBank = assistant('lab', {
      replyActions: ra({
        actions: [{
          type: 'choose_option',
          payload: { kind: 'profile', gap_code: 'lab_report', options: [{ code: 'none', label: '無' }] }
        }]
      })
    })
    expect(findGapCtaHostMessage([labBank], { openProfileGaps: [] })?.id).toBeUndefined()
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

  it('lab_report profile enum (single, confirm=false) hides confirm — chip is direct submit', () => {
    const projection = projectReplyActionsToCtas({
      replyActions: ra({
        actions: [{
          type: 'choose_option',
          payload: {
            kind: 'profile',
            mode: 'single',
            confirm: false,
            gap_code: 'lab_report',
            answer_type: 'enum',
            options: [
              { code: 'none', label: '沒有' },
              { code: 'within_6m', label: '有：半年內' }
            ]
          }
        }]
      }),
      canShowRecommendSlot: false,
      canShowUpload: false,
      canShowCheckup: false,
      canShowVitals: false,
      expertReviewStatus: 'none'
    })
    expect(projection.flags.choices.map(c => c.code)).toEqual(['none', 'within_6m'])
    expect(projection.flags.showConfirm).toBe(false)
    expect(projection.chooseOption?.gap_code).toBe('lab_report')
  })

  it('lab_followup choose_option preserves maps_to on chips', () => {
    const projection = projectReplyActionsToCtas({
      replyActions: ra({
        actions: [{
          type: 'choose_option',
          payload: {
            kind: 'lab_followup',
            mode: 'single',
            confirm: false,
            options: [
              { code: 'upload', label: '上傳報告', maps_to: 'ask_report' },
              { code: 'go_checkup', label: '我想檢查', maps_to: 'offer_checkup' }
            ]
          }
        }]
      }),
      canShowRecommendSlot: false,
      canShowUpload: false,
      canShowCheckup: false,
      canShowVitals: false,
      expertReviewStatus: 'none'
    })
    expect(projection.chooseOption?.kind).toBe('lab_followup')
    expect(projection.flags.choices).toEqual([
      { code: 'upload', label: '上傳報告', maps_to: 'ask_report' },
      { code: 'go_checkup', label: '我想檢查', maps_to: 'offer_checkup' }
    ])
    expect(projection.flags.showConfirm).toBe(false)
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

  it('intentional none / degraded reply_actions paint no CTAs (no legacy fallback)', () => {
    const degraded = assistant('latest', {
      uploadOffer: true,
      replyActions: ra({ degraded: true, actions: [{ type: 'ask_report' }] })
    })
    const noneOnly = assistant('latest', {
      uploadOffer: true,
      replyActions: ra({ actions: [{ type: 'none' }] })
    })
    for (const msg of [degraded, noneOnly]) {
      const v = buildTurnActionsVisibility({
        message: msg,
        ctx: baseCtx({ lastAssistantId: 'latest' }),
        goalOptions: [],
        needsMultiConfirm: false
      })
      expect(v.fromReplyActions).toBe(true)
      expect(v.showUpload).toBe(false)
      expect(v.showSubmitReview).toBe(false)
      expect(v.showRecommend).toBe(false)
    }
  })

  it('absent reply_actions: profile chips ok; never invent recommend / upload', () => {
    const msg = assistant('latest', {
      options: [
        { code: 'sleep', label: '睡眠' },
        { code: 'weight', label: '減重' }
      ],
      turnType: 'profile',
      profileQuestion: { gap_code: 'diet', answer_type: 'enum' },
      uploadOffer: true
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
    expect(v.showUpload).toBe(false)
  })

  it('none-only + latest → showSubmitReview=false (root-cause regression)', () => {
    const msg = assistant('latest', {
      replyActions: ra({ actions: [{ type: 'none' }] })
    })
    const v = buildTurnActionsVisibility({
      message: msg,
      ctx: baseCtx({ lastAssistantId: 'latest' }),
      goalOptions: [],
      needsMultiConfirm: false,
      expertReviewStatus: 'none'
    })
    expect(v.showSubmitReview).toBe(false)
    expect(v.showViewRecommend).toBe(false)
    expect(v.showUpload).toBe(false)
  })

  it('reportAskActive blocks offer_recommend until report ask clears', () => {
    const msg = assistant('latest', {
      replyActions: ra({
        actions: [{ type: 'offer_recommend' }, { type: 'ask_report' }]
      })
    })
    const blocked = buildTurnActionsVisibility({
      message: msg,
      ctx: baseCtx({ lastAssistantId: 'latest', reportAskActive: true }),
      goalOptions: [],
      needsMultiConfirm: false,
      expertReviewStatus: 'none'
    })
    expect(blocked.showUpload).toBe(true)
    expect(blocked.showSubmitReview).toBe(false)

    const open = buildTurnActionsVisibility({
      message: msg,
      ctx: baseCtx({ lastAssistantId: 'latest', reportAskActive: false }),
      goalOptions: [],
      needsMultiConfirm: false,
      expertReviewStatus: 'none'
    })
    expect(open.showSubmitReview).toBe(true)
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

  it('gap CTA lift: ask_vitals moves to latest when stream is offer_recommend-only', () => {
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
      gapCtaHostReplyActions: bank.replyActions,
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
    // Bank host behind latest: CTAs lifted away.
    expect(onBank.vitalsFields).toEqual([])
    expect(onBank.showViewRecommend).toBe(false)

    const onStream = buildTurnActionsVisibility({
      message: stream,
      ctx,
      goalOptions: [],
      needsMultiConfirm: false,
      expertReviewStatus: 'none',
      flow: 'standard'
    })
    expect(onStream.vitalsFields).toEqual(['height'])
    expect(onStream.vitalsGapCode).toBe('height')
    // Pending gap behind latest suppresses recommend/upload on the covering turn.
    expect(onStream.showViewRecommend).toBe(false)
    expect(onStream.showUpload).toBe(false)
  })

  it('latest ask_vitals wins over a lifted older gap (age correction)', () => {
    const bank = assistant('bank', {
      replyActions: ra({
        actions: [{ type: 'ask_vitals', payload: { fields: ['height'], gap_code: 'height' } }]
      })
    })
    const stream = assistant('stream', {
      replyActions: ra({
        actions: [{ type: 'ask_vitals', payload: { fields: ['age'], gap_code: 'age' } }]
      })
    })
    const ctx = baseCtx({
      lastAssistantId: 'stream',
      gapCtaHostId: 'bank',
      gapCtaHostReplyActions: bank.replyActions,
      openProfileGaps: ['height'],
      hasReportAnalysis: true
    })
    const onStream = buildTurnActionsVisibility({
      message: stream,
      ctx,
      goalOptions: [],
      needsMultiConfirm: false,
      expertReviewStatus: 'none'
    })
    expect(onStream.vitalsFields).toEqual(['age'])
    expect(onStream.vitalsGapCode).toBe('age')
  })

  it('choose_option sex chips lift to latest when stream covers with offer_recommend', () => {
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
    const ctx = baseCtx({
      lastAssistantId: 'stream',
      gapCtaHostId: 'bank',
      gapCtaHostReplyActions: bank.replyActions
    })
    const onBank = buildTurnActionsVisibility({
      message: bank,
      ctx,
      goalOptions: [],
      needsMultiConfirm: false
    })
    expect(onBank.choices).toEqual([])
    const onStream = buildTurnActionsVisibility({
      message: stream,
      ctx,
      goalOptions: [],
      needsMultiConfirm: false
    })
    expect(onStream.choices.map(c => c.code)).toEqual(['M', 'F'])
    expect(onStream.showSubmitReview).toBe(false)
  })

  it('free chips on latest stay visible while bank gap is lifted', () => {
    const bank = assistant('bank', {
      replyActions: ra({
        actions: [{
          type: 'choose_option',
          payload: {
            kind: 'profile',
            gap_code: 'diet',
            options: [
              { code: 'omnivore', label: '葷' },
              { code: 'veg', label: '素' }
            ]
          }
        }]
      })
    })
    const stream = assistant('stream', {
      replyActions: ra({
        actions: [{
          type: 'choose_option',
          payload: {
            kind: 'free',
            mode: 'single',
            options: [
              { code: 'sleep_ok', label: '睡眠還好' },
              { code: 'sleep_bad', label: '睡不好' }
            ]
          }
        }]
      })
    })
    const ctx = baseCtx({
      lastAssistantId: 'stream',
      gapCtaHostId: 'bank',
      gapCtaHostReplyActions: bank.replyActions
    })
    const onStream = buildTurnActionsVisibility({
      message: stream,
      ctx,
      goalOptions: [],
      needsMultiConfirm: false
    })
    expect(onStream.choices.map(c => c.code)).toEqual([
      'omnivore',
      'veg',
      'sleep_ok',
      'sleep_bad'
    ])
  })

  it('path A guide renders offer_checkup and path_switch from reply_actions', () => {
    const msg = assistant('latest', {
      replyActions: ra({
        adaptor: 'rule',
        actions: [
          { type: 'offer_checkup', payload: { url: 'https://example.test/checkup' } },
          {
            type: 'choose_option',
            payload: {
              kind: 'path_switch',
              mode: 'single',
              confirm: false,
              options: [{ code: 'b', label: '' }]
            }
          }
        ]
      })
    })
    const visibility = buildTurnActionsVisibility({
      message: msg,
      ctx: baseCtx({ lastAssistantId: 'latest', conversationPath: 'A' }),
      goalOptions: [],
      needsMultiConfirm: true
    })
    expect(visibility.choices.map(choice => choice.code)).toEqual(['b'])
    expect(visibility.showConfirm).toBe(false)
    expect(visibility.showCheckup).toBe(true)
    expect(visibility.showSubmitReview).toBe(false)
    expect(hasUsableGapCta(msg.replyActions)).toBe(false)
    expect(detectPathRuleCopyKind(msg.replyActions)).toBe('path_a_cap')
    expect(pathRuleBubbleI18nKey('path_a_cap')).toBe('chat.pathACap')
    expect(pathSwitchChipI18nKey('path_a_cap')).toBe('chat.pathSwitchToConsult')
    expect(isPathSwitchOptionCode(msg.replyActions, 'b')).toBe(true)
  })

  it('path C await upload renders ask_report + offer_checkup + path_switch', () => {
    const msg = assistant('latest', {
      parts: [{ type: 'text', text: '' }],
      replyActions: ra({
        adaptor: 'rule',
        actions: [
          { type: 'ask_report', payload: { option_codes: ['upload'] } },
          { type: 'offer_checkup', payload: {} },
          {
            type: 'choose_option',
            payload: {
              kind: 'path_switch',
              mode: 'single',
              confirm: false,
              options: [{ code: 'b', label: '' }]
            }
          }
        ]
      })
    })
    const visibility = buildTurnActionsVisibility({
      message: msg,
      ctx: baseCtx({
        lastAssistantId: 'latest',
        conversationPath: 'C',
        checkupLinkReady: true
      }),
      goalOptions: [],
      needsMultiConfirm: true
    })
    expect(visibility.showUpload).toBe(true)
    expect(visibility.showCheckup).toBe(true)
    expect(visibility.choices.map(choice => choice.code)).toEqual(['b'])
    expect(detectPathRuleCopyKind(msg.replyActions)).toBe('path_c_await_upload')
    expect(pathRuleBubbleI18nKey('path_c_await_upload')).toBe('chat.pathCAwaitUpload')
    expect(pathSwitchChipI18nKey('path_c_await_upload')).toBe('chat.pathCCancelToB')
  })

  it('lab_report choose_option: reply_actions path ignores legacy needsMultiConfirm (no confirm btn)', () => {
    // Regression: #24 projection hid confirm for enum, but ChatPanel still treated
    // LAB_GAP_CODES as "select then confirm". Visibility must stay showConfirm=false
    // even when legacy needsMultiConfirm is true.
    const msg = assistant('latest', {
      turnType: 'profile',
      profileQuestion: { gap_code: 'lab_report', answer_type: 'enum' },
      replyActions: ra({
        source: 'questionnaire',
        actions: [{
          type: 'choose_option',
          payload: {
            kind: 'profile',
            mode: 'single',
            confirm: false,
            gap_code: 'lab_report',
            answer_type: 'enum',
            options: [
              { code: 'none', label: '沒有' },
              { code: 'within_6m', label: '有：半年內' }
            ]
          }
        }]
      })
    })
    const v = buildTurnActionsVisibility({
      message: msg,
      ctx: baseCtx({ lastAssistantId: 'latest', gapCtaHostId: 'latest' }),
      intake: msg,
      goalOptions: [],
      needsMultiConfirm: true
    })
    expect(v.fromReplyActions).toBe(true)
    expect(v.choices.map(c => c.code)).toEqual(['none', 'within_6m'])
    expect(v.showConfirm).toBe(false)
  })
})
