import { describe, expect, it, beforeEach } from 'vitest'
import {
  CONTINUE_CONSULT_I18N_KEY,
  detectPathRuleCopyKind,
  findGapCtaHostMessage,
  hasLabReportBankOrFollowup,
  hasReportRequiredAsk,
  hasUsableGapCta,
  isContinueChatOption,
  isContinueConsultationOption,
  isPathSwitchOptionCode,
  isUsableReplyActions,
  isViewRecommendationsOfferAction,
  normalizeChooseOptionMapsTo,
  offerRecommendLabelKey,
  offerRecommendPayload,
  parseReplyActions,
  pathRuleBubbleI18nKey,
  pathSwitchChipI18nKey,
  pathSwitchLabelNeedsI18n,
  pathSwitchOptionI18nKey,
  projectReplyActionsToCtas,
  resetReplyActionsUnknownLog,
  resolvePathSwitchChoiceLabels,
  shouldShowContinueConsultCta,
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

const VIEW_RECOMMEND_ACTION = {
  type: 'offer_recommend' as const,
  payload: {
    mode: 'view_recommendations' as const,
    label: '查看推薦方案',
    path: '/app/recommendations'
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
    expect(hasUsableGapCta(ra({ actions: [VIEW_RECOMMEND_ACTION] }))).toBe(false)
    expect(hasUsableGapCta(ra({ actions: [{ type: 'ask_report' }, { type: 'offer_checkup' }] }))).toBe(false)
    expect(hasUsableGapCta(ra({ actions: [{ type: 'ask_goal', payload: { goal_codes: ['sleep'] } }] }))).toBe(false)
    expect(hasUsableGapCta(ra({
      actions: [
        VIEW_RECOMMEND_ACTION,
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
    expect(hasReportRequiredAsk(ra({ actions: [VIEW_RECOMMEND_ACTION] }))).toBe(false)

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
      replyActions: ra({ actions: [VIEW_RECOMMEND_ACTION] })
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

  it('ask_goal／consultation_goals stay multi+confirm even if wire says mode=single', () => {
    const askGoal = projectReplyActionsToCtas({
      replyActions: ra({
        actions: [{ type: 'ask_goal', payload: { goal_codes: ['sleep', 'immune_boost'] } }]
      }),
      canShowRecommendSlot: false,
      canShowUpload: false,
      canShowCheckup: false,
      canShowVitals: false,
      expertReviewStatus: 'none'
    })
    expect(askGoal.flags.showConfirm).toBe(true)
    expect(askGoal.flags.choices.length).toBeGreaterThanOrEqual(2)

    const goalsSingleWire = projectReplyActionsToCtas({
      replyActions: ra({
        actions: [{
          type: 'choose_option',
          payload: {
            kind: 'consultation_goals',
            mode: 'single',
            confirm: false,
            options: [
              { code: 'sleep', label: '睡眠' },
              { code: 'weight_loss', label: '減重' }
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
    expect(goalsSingleWire.flags.showConfirm).toBe(true)

    const freeSingle = projectReplyActionsToCtas({
      replyActions: ra({
        actions: [{
          type: 'choose_option',
          payload: {
            kind: 'free',
            mode: 'single',
            confirm: false,
            options: [
              { code: 'a', label: '選項 A' },
              { code: 'b', label: '選項 B' }
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
    expect(freeSingle.flags.showConfirm).toBe(false)
    expect(freeSingle.flags.choices.map(c => c.code)).toEqual(['a', 'b'])
  })

  it('parses view_recommendations offer_recommend; ignores dual_choice', () => {
    expect(isViewRecommendationsOfferAction(VIEW_RECOMMEND_ACTION)).toBe(true)
    expect(offerRecommendPayload(VIEW_RECOMMEND_ACTION).mode).toBe('view_recommendations')
    expect(isViewRecommendationsOfferAction({
      type: 'offer_recommend',
      payload: { mode: 'dual_choice' }
    })).toBe(false)
    expect(projectReplyActionsToCtas({
      replyActions: ra({ actions: [VIEW_RECOMMEND_ACTION] }),
      canShowRecommendSlot: true,
      canShowUpload: false,
      canShowCheckup: false,
      canShowVitals: false,
      expertReviewStatus: 'none'
    }).flags.showViewRecommend).toBe(true)
    expect(projectReplyActionsToCtas({
      replyActions: ra({
        actions: [{ type: 'offer_recommend', payload: { mode: 'dual_choice' } }]
      }),
      canShowRecommendSlot: true,
      canShowUpload: false,
      canShowCheckup: false,
      canShowVitals: false,
      expertReviewStatus: 'none'
    }).flags.showViewRecommend).toBe(false)
  })

  it('offer_recommend copy path differs by flow (submit vs view)', () => {
    expect(offerRecommendLabelKey(undefined)).toBe('chat.viewRecommend')
    expect(offerRecommendLabelKey('standard')).toBe('chat.viewRecommend')

    const expert = projectReplyActionsToCtas({
      replyActions: ra({ actions: [VIEW_RECOMMEND_ACTION] }),
      canShowRecommendSlot: true,
      canShowUpload: false,
      canShowCheckup: false,
      canShowVitals: false,
      expertReviewStatus: 'none'
    })
    expect(expert.flags.showSubmitReview).toBe(false)
    expect(expert.flags.showViewRecommend).toBe(true)

    const standard = projectReplyActionsToCtas({
      replyActions: ra({ actions: [VIEW_RECOMMEND_ACTION] }),
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
    expect(projection.flags.showFullTest).toBe(false)
  })

  it('offer_full_test projects url／label／copy／marker_count (default Body Decode url)', () => {
    const withPayload = projectReplyActionsToCtas({
      replyActions: ra({
        actions: [{
          type: 'offer_full_test',
          payload: {
            url: 'https://example.test/body-decode',
            label: '了解完整 136 項檢測',
            copy: '這份報告解析出 42 項指標，少於完整健康分析建議的 136 項。',
            marker_count: 42
          }
        }]
      }),
      canShowRecommendSlot: true,
      canShowUpload: true,
      canShowCheckup: true,
      canShowVitals: true,
      expertReviewStatus: 'none'
    })
    expect(withPayload.flags.showFullTest).toBe(true)
    expect(withPayload.fullTestUrlOverride).toBe('https://example.test/body-decode')
    expect(withPayload.fullTestLabelOverride).toBe('了解完整 136 項檢測')
    expect(withPayload.fullTestCopyOverride).toContain('42')
    expect(withPayload.fullTestMarkerCount).toBe(42)

    const emptyUrl = projectReplyActionsToCtas({
      replyActions: ra({
        actions: [{ type: 'offer_full_test', payload: { n: 0 } }]
      }),
      canShowRecommendSlot: true,
      canShowUpload: true,
      canShowCheckup: true,
      canShowVitals: true,
      expertReviewStatus: 'none'
    })
    expect(emptyUrl.flags.showFullTest).toBe(true)
    expect(emptyUrl.fullTestUrlOverride).toBe('https://www.younger.tw/products/body-decode')
    expect(emptyUrl.fullTestMarkerCount).toBe(0)
  })

  it('offer_full_test coexists after offer_recommend／offer_checkup', () => {
    const projection = projectReplyActionsToCtas({
      replyActions: ra({
        actions: [
          {
            type: 'offer_recommend',
            payload: {
              mode: 'view_recommendations',
              label: '查看推薦方案',
              path: '/app/recommendations'
            }
          },
          { type: 'offer_checkup', payload: { url: 'https://labs.example/x' } },
          {
            type: 'offer_full_test',
            payload: { url: 'https://example.test/full', marker_count: 12 }
          }
        ]
      }),
      canShowRecommendSlot: true,
      canShowUpload: true,
      canShowCheckup: true,
      canShowVitals: true,
      expertReviewStatus: 'none'
    })
    expect(projection.flags.showViewRecommend).toBe(true)
    expect(projection.flags.showCheckup).toBe(true)
    expect(projection.flags.showFullTest).toBe(true)
    expect(projection.fullTestUrlOverride).toBe('https://example.test/full')
    expect(projection.fullTestMarkerCount).toBe(12)
  })

  it('seq 750: open_question_reply + offer_checkup + path_switch keeps both chip groups', () => {
    // Core Path A ≥15: free-reply chips coexist with A→B path_switch (empty label → FE i18n).
    const projection = projectReplyActionsToCtas({
      replyActions: ra({
        adaptor: 'rule',
        actions: [
          { type: 'none' },
          {
            type: 'choose_option',
            payload: {
              kind: 'open_question_reply',
              mode: 'single',
              confirm: false,
              options: [
                { code: 'continue', label: '繼續健康諮詢' },
                { code: 'enough', label: '先這樣就好' }
              ]
            }
          },
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
      }),
      canShowRecommendSlot: false,
      canShowUpload: false,
      canShowCheckup: true,
      canShowVitals: false,
      expertReviewStatus: 'none'
    })
    expect(projection.chooseOption?.kind).toBe('open_question_reply')
    expect(projection.pathSwitch?.kind).toBe('path_switch')
    expect(projection.flags.choices.map(c => c.code)).toEqual(['continue', 'enough', 'b'])
    expect(projection.flags.showConfirm).toBe(false)
    expect(projection.flags.showCheckup).toBe(true)
  })

  it('path_switch before open_question_reply still keeps both (order-independent)', () => {
    const projection = projectReplyActionsToCtas({
      replyActions: ra({
        actions: [
          {
            type: 'choose_option',
            payload: {
              kind: 'path_switch',
              mode: 'single',
              confirm: false,
              options: [{ code: 'b', label: '' }]
            }
          },
          {
            type: 'choose_option',
            payload: {
              kind: 'open_question_reply',
              mode: 'single',
              confirm: false,
              options: [{ code: 'continue', label: '繼續健康諮詢' }]
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
    expect(projection.chooseOption?.kind).toBe('open_question_reply')
    expect(projection.flags.choices.map(c => c.code)).toEqual(['continue', 'b'])
  })

  it('consultation_goals + path_switch: goals stay primary; switch chip appended', () => {
    const projection = projectReplyActionsToCtas({
      replyActions: ra({
        actions: [
          {
            type: 'choose_option',
            payload: {
              kind: 'path_switch',
              mode: 'single',
              confirm: false,
              options: [{ code: 'b', label: '' }]
            }
          },
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
    expect(projection.chooseOption?.kind).toBe('consultation_goals')
    expect(projection.flags.choices.map(c => c.code)).toEqual(['sleep', 'weight_loss', 'b'])
    expect(projection.flags.showConfirm).toBe(true)
  })

  it('profile sex + continue_chat: sex chips stay primary; 繼續聊聊 appended (run22)', () => {
    // Core re-asks sex after tangent with soft continue — FE must not drop continue_chat.
    const projection = projectReplyActionsToCtas({
      replyActions: ra({
        actions: [
          { type: 'none', payload: {} },
          {
            type: 'choose_option',
            payload: {
              kind: 'profile',
              mode: 'single',
              confirm: false,
              gap_code: 'sex',
              answer_type: 'enum',
              options: [
                { code: 'M', label: '生理男' },
                { code: 'F', label: '生理女' }
              ]
            }
          },
          {
            type: 'choose_option',
            payload: {
              kind: 'continue_chat',
              mode: 'single',
              confirm: false,
              options: [{ code: 'continue_chat', label: '繼續聊聊' }]
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
    expect(projection.chooseOption?.kind).toBe('profile')
    expect(projection.chooseOption?.gap_code).toBe('sex')
    expect(projection.continueChat?.kind).toBe('continue_chat')
    expect(projection.flags.choices.map(c => c.code)).toEqual(['M', 'F', 'continue_chat'])
    expect(projection.flags.choices.map(c => c.label)).toEqual(['生理男', '生理女', '繼續聊聊'])
    expect(projection.flags.showConfirm).toBe(false)

    const replyActions = ra({
      actions: [
        {
          type: 'choose_option',
          payload: {
            kind: 'profile',
            gap_code: 'sex',
            answer_type: 'enum',
            mode: 'single',
            confirm: false,
            options: [
              { code: 'M', label: '生理男' },
              { code: 'F', label: '生理女' }
            ]
          }
        },
        {
          type: 'choose_option',
          payload: {
            kind: 'continue_chat',
            mode: 'single',
            confirm: false,
            options: [{ code: 'continue_chat', label: '繼續聊聊' }]
          }
        }
      ]
    })
    expect(isContinueChatOption(replyActions, 'continue_chat')).toBe(true)
    expect(isContinueChatOption(replyActions, 'M')).toBe(false)

    const visibility = buildTurnActionsVisibility({
      message: {
        id: 'sex-reask',
        role: 'assistant',
        parts: [{ type: 'text', text: '請問您的生理性別是？' }],
        replyActions
      },
      ctx: {
        readonlyMode: false,
        escalated: false,
        pending: false,
        goalSelectActive: false,
        reportAskActive: false,
        hasReportAnalysis: false,
        reportRetry: false,
        checkupLinkReady: true,
        lastAssistantId: 'sex-reask',
        conversationPath: 'B',
        openProfileGaps: ['sex'],
        pathEntryPending: false
      },
      goalOptions: [],
      needsMultiConfirm: false
    })
    expect(visibility.choices.map(c => c.code)).toEqual(['M', 'F', 'continue_chat'])
    expect(visibility.choices.map(c => c.label)).toEqual(['生理男', '生理女', '繼續聊聊'])
  })

  it('continue_chat before profile still keeps both (order-independent)', () => {
    const projection = projectReplyActionsToCtas({
      replyActions: ra({
        actions: [
          {
            type: 'choose_option',
            payload: {
              kind: 'continue_chat',
              mode: 'single',
              confirm: false,
              options: [{ code: 'continue_chat', label: '繼續聊聊' }]
            }
          },
          {
            type: 'choose_option',
            payload: {
              kind: 'profile',
              mode: 'single',
              confirm: false,
              gap_code: 'sex',
              answer_type: 'enum',
              options: [
                { code: 'M', label: '生理男' },
                { code: 'F', label: '生理女' }
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
    expect(projection.chooseOption?.kind).toBe('profile')
    expect(projection.flags.choices.map(c => c.code)).toEqual(['M', 'F', 'continue_chat'])
  })

  it('profile / lab_followup + path_switch: primary kind unchanged; switch appended', () => {
    const profile = projectReplyActionsToCtas({
      replyActions: ra({
        actions: [
          {
            type: 'choose_option',
            payload: {
              kind: 'profile',
              mode: 'single',
              confirm: false,
              gap_code: 'diet',
              answer_type: 'enum',
              options: [
                { code: 'omnivore', label: '雜食' },
                { code: 'veg', label: '素食' }
              ]
            }
          },
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
      }),
      canShowRecommendSlot: false,
      canShowUpload: false,
      canShowCheckup: false,
      canShowVitals: false,
      expertReviewStatus: 'none'
    })
    expect(profile.chooseOption?.kind).toBe('profile')
    expect(profile.chooseOption?.gap_code).toBe('diet')
    expect(profile.flags.choices.map(c => c.code)).toEqual(['omnivore', 'veg', 'b'])
    expect(profile.flags.showConfirm).toBe(false)

    const lab = projectReplyActionsToCtas({
      replyActions: ra({
        actions: [
          {
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
          },
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
      }),
      canShowRecommendSlot: false,
      canShowUpload: false,
      canShowCheckup: false,
      canShowVitals: false,
      expertReviewStatus: 'none'
    })
    expect(lab.chooseOption?.kind).toBe('lab_followup')
    expect(lab.flags.choices.map(c => c.code)).toEqual(['upload', 'go_checkup', 'b'])
  })

  it('solo path_switch (+ offer_checkup) unchanged', () => {
    const projection = projectReplyActionsToCtas({
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
      }),
      canShowRecommendSlot: false,
      canShowUpload: false,
      canShowCheckup: true,
      canShowVitals: false,
      expertReviewStatus: 'none'
    })
    expect(projection.chooseOption?.kind).toBe('path_switch')
    expect(projection.pathSwitch?.kind).toBe('path_switch')
    expect(projection.flags.choices.map(c => c.code)).toEqual(['b'])
    expect(projection.flags.showConfirm).toBe(false)
    expect(projection.flags.showCheckup).toBe(true)
  })

  it('triad asking: open_question_reply + continue_consultation + offer_recommend keeps all chips', () => {
    // core #135 B／C 摘要問句版
    const replyActions = ra({
      adaptor: 'rule',
      actions: [
        VIEW_RECOMMEND_ACTION,
        { type: 'ask_report', payload: {} },
        {
          type: 'choose_option',
          payload: {
            kind: 'open_question_reply',
            mode: 'single',
            confirm: false,
            options: [
              { code: 'no_more', label: '我沒有問題了' },
              { code: 'suggest', label: '你有什麼建議' }
            ]
          }
        },
        {
          type: 'choose_option',
          payload: {
            kind: 'continue_consultation',
            mode: 'single',
            confirm: false,
            options: [{ code: 'continue', label: '繼續健康諮詢' }]
          }
        }
      ]
    })
    const projection = projectReplyActionsToCtas({
      replyActions,
      canShowRecommendSlot: true,
      canShowUpload: true,
      canShowCheckup: false,
      canShowVitals: false,
      expertReviewStatus: 'none'
    })
    expect(projection.chooseOption?.kind).toBe('open_question_reply')
    expect(projection.continueConsultation?.kind).toBe('continue_consultation')
    expect(projection.flags.choices.map(c => c.code)).toEqual([
      'no_more',
      'suggest',
      'continue'
    ])
    expect(projection.flags.choices.find(c => c.code === 'continue')?.label)
      .toBe('繼續健康諮詢')
    expect(projection.flags.choices.find(c => c.code === 'continue')?.maps_to)
      .toBe('continue_consultation')
    expect(projection.flags.showSubmitReview).toBe(false)
    expect(projection.flags.showViewRecommend).toBe(true)
    expect(projection.flags.showUpload).toBe(true)
    expect(projection.flags.showConfirm).toBe(false)
    expect(isContinueConsultationOption(replyActions, 'continue')).toBe(true)
    // Stamped maps_to suppresses FE-appended duplicate continue CTA.
    expect(shouldShowContinueConsultCta({
      showUpload: true,
      showCheckup: true,
      choices: projection.flags.choices
    })).toBe(false)
  })

  it('triad non-asking: offer_recommend + continue_consultation only', () => {
    const projection = projectReplyActionsToCtas({
      replyActions: ra({
        adaptor: 'rule',
        actions: [
          VIEW_RECOMMEND_ACTION,
          {
            type: 'choose_option',
            payload: {
              kind: 'continue_consultation',
              mode: 'single',
              confirm: false,
              options: [{ code: 'continue', label: '繼續健康諮詢' }]
            }
          }
        ]
      }),
      canShowRecommendSlot: true,
      canShowUpload: false,
      canShowCheckup: false,
      canShowVitals: false,
      expertReviewStatus: 'none'
    })
    expect(projection.chooseOption?.kind).toBe('continue_consultation')
    expect(projection.continueConsultation?.kind).toBe('continue_consultation')
    expect(projection.flags.choices).toEqual([
      { code: 'continue', label: '繼續健康諮詢', maps_to: 'continue_consultation' }
    ])
    expect(projection.flags.showSubmitReview).toBe(false)
    expect(projection.flags.showViewRecommend).toBe(true)
  })

  it('path_switch companion still appends when continue_consultation also present', () => {
    const projection = projectReplyActionsToCtas({
      replyActions: ra({
        adaptor: 'rule',
        actions: [
          {
            type: 'choose_option',
            payload: {
              kind: 'open_question_reply',
              mode: 'single',
              confirm: false,
              options: [{ code: 'no_more', label: '我沒有問題了' }]
            }
          },
          { type: 'offer_checkup', payload: { url: 'https://example.test/checkup' } },
          {
            type: 'choose_option',
            payload: {
              kind: 'path_switch',
              mode: 'single',
              confirm: false,
              options: [{ code: 'b', label: '' }]
            }
          },
          {
            type: 'choose_option',
            payload: {
              kind: 'continue_consultation',
              mode: 'single',
              confirm: false,
              options: [{ code: 'continue', label: '繼續健康諮詢' }]
            }
          }
        ]
      }),
      canShowRecommendSlot: false,
      canShowUpload: false,
      canShowCheckup: true,
      canShowVitals: false,
      expertReviewStatus: 'none'
    })
    expect(projection.chooseOption?.kind).toBe('open_question_reply')
    expect(projection.flags.choices.map(c => c.code)).toEqual([
      'no_more',
      'b',
      'continue'
    ])
  })

  it('path A path_switch-only guide unchanged (no continue_consultation invented)', () => {
    const projection = projectReplyActionsToCtas({
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
      }),
      canShowRecommendSlot: true,
      canShowUpload: false,
      canShowCheckup: true,
      canShowVitals: false,
      expertReviewStatus: 'none'
    })
    expect(projection.continueConsultation).toBeNull()
    expect(projection.flags.choices.map(c => c.code)).toEqual(['b'])
    expect(projection.flags.showSubmitReview).toBe(false)
  })
})

describe('shouldShowContinueConsultCta — checkup suggestion FE append', () => {
  const labFollowupChoices = [
    { code: 'upload', label: '上傳報告', maps_to: 'ask_report' },
    { code: 'checkup', label: '我想檢查', maps_to: 'offer_checkup' }
  ]

  it('(a) lab_followup maps_to chips → show continue consult', () => {
    expect(shouldShowContinueConsultCta({
      showUpload: false,
      showCheckup: false,
      choices: labFollowupChoices
    })).toBe(true)
  })

  it('(b) ask_report + offer_checkup buttons → show continue consult', () => {
    const projection = projectReplyActionsToCtas({
      replyActions: ra({
        actions: [
          { type: 'ask_report' },
          { type: 'offer_checkup', payload: { url: 'https://labs.example/x' } }
        ]
      }),
      canShowRecommendSlot: false,
      canShowUpload: true,
      canShowCheckup: true,
      canShowVitals: false,
      expertReviewStatus: 'none'
    })
    expect(projection.flags.showUpload).toBe(true)
    expect(projection.flags.showCheckup).toBe(true)
    expect(shouldShowContinueConsultCta({
      showUpload: projection.flags.showUpload,
      showCheckup: projection.flags.showCheckup,
      choices: projection.flags.choices
    })).toBe(true)
  })

  it('(a)+(b) together still a single show flag (no duplicate CTA)', () => {
    expect(shouldShowContinueConsultCta({
      showUpload: true,
      showCheckup: true,
      choices: labFollowupChoices
    })).toBe(true)
  })

  it('ask_report alone or offer_checkup alone → hide', () => {
    expect(shouldShowContinueConsultCta({
      showUpload: true,
      showCheckup: false,
      choices: []
    })).toBe(false)
    expect(shouldShowContinueConsultCta({
      showUpload: false,
      showCheckup: true,
      choices: []
    })).toBe(false)
  })

  it('profile / goal chips without maps_to → hide', () => {
    expect(shouldShowContinueConsultCta({
      showUpload: false,
      showCheckup: false,
      choices: [
        { code: 'sleep', label: '睡眠' },
        { code: 'M', label: '男' }
      ]
    })).toBe(false)
  })

  it('path does not hide continue consult on lab_followup chips', () => {
    expect(shouldShowContinueConsultCta({
      showUpload: false,
      showCheckup: false,
      choices: labFollowupChoices
    })).toBe(true)
  })

  it('payload already has continue chip → do not append a second button', () => {
    expect(shouldShowContinueConsultCta({
      showUpload: true,
      showCheckup: true,
      choices: [
        ...labFollowupChoices,
        { code: 'continue', label: '繼續健康諮詢', maps_to: 'continue_consultation' }
      ]
    })).toBe(false)
  })

  it('stream label key is chat.continueConsult (must match core continue-health copy)', () => {
    expect(CONTINUE_CONSULT_I18N_KEY).toBe('chat.continueConsult')
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
          VIEW_RECOMMEND_ACTION
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
    expect(v.showSubmitReview).toBe(false)
    expect(v.showViewRecommend).toBe(true)
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

  it('reportAskActive no longer FE-blocks offer_recommend (core／RA owns completion)', () => {
    const msg = assistant('latest', {
      replyActions: ra({
        actions: [VIEW_RECOMMEND_ACTION, { type: 'ask_report' }]
      })
    })
    const withReportAsk = buildTurnActionsVisibility({
      message: msg,
      ctx: baseCtx({ lastAssistantId: 'latest', reportAskActive: true }),
      goalOptions: [],
      needsMultiConfirm: false,
      expertReviewStatus: 'none'
    })
    expect(withReportAsk.showUpload).toBe(true)
    expect(withReportAsk.showSubmitReview).toBe(false)
    expect(withReportAsk.showViewRecommend).toBe(true)

    const cleared = buildTurnActionsVisibility({
      message: msg,
      ctx: baseCtx({ lastAssistantId: 'latest', reportAskActive: false }),
      goalOptions: [],
      needsMultiConfirm: false,
      expertReviewStatus: 'none'
    })
    expect(cleared.showSubmitReview).toBe(false)
    expect(cleared.showViewRecommend).toBe(true)
  })

  it('/chat-ai standard flow shows view-recommend for offer_recommend', () => {
    const msg = assistant('latest', {
      replyActions: ra({ actions: [VIEW_RECOMMEND_ACTION] })
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
          VIEW_RECOMMEND_ACTION,
          { type: 'ask_vitals', payload: { fields: ['age'] } }
        ]
      })
    })
    const pending = buildTurnActionsVisibility({
      message: msg,
      ctx: baseCtx({
        pending: true,
        hasReportAnalysis: true,
        lastAssistantId: 'latest'
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
        lastAssistantId: 'latest'
      }),
      goalOptions: [],
      needsMultiConfirm: false,
      expertReviewStatus: 'none',
      flow: 'standard'
    })
    expect(readonly.showViewRecommend).toBe(false)
    expect(readonly.vitalsFields).toEqual([])
  })

  it('no lift: bank ask_vitals stays off latest; latest shows only own offer_recommend', () => {
    const bank = assistant('bank', {
      replyActions: ra({
        actions: [{ type: 'ask_vitals', payload: { fields: ['height'], gap_code: 'height' } }]
      })
    })
    const stream = assistant('stream', {
      replyActions: ra({ actions: [VIEW_RECOMMEND_ACTION, { type: 'ask_report' }] })
    })
    const ctx = baseCtx({
      lastAssistantId: 'stream',
      hasReportAnalysis: true,
      openProfileGaps: ['height']
    })
    const onBank = buildTurnActionsVisibility({
      message: bank,
      ctx,
      goalOptions: [],
      needsMultiConfirm: false,
      expertReviewStatus: 'none',
      flow: 'standard'
    })
    // Old message: keep no buttons (現行).
    expect(onBank.vitalsFields).toEqual([])
    expect(onBank.choices).toEqual([])
    expect(onBank.showViewRecommend).toBe(false)

    const onStream = buildTurnActionsVisibility({
      message: stream,
      ctx,
      goalOptions: [],
      needsMultiConfirm: false,
      expertReviewStatus: 'none',
      flow: 'standard'
    })
    // Latest: own RA only — do not lift bank height numpad.
    expect(onStream.vitalsFields).toEqual([])
    expect(onStream.showViewRecommend).toBe(true)
    // hasReportAnalysis suppresses upload even when ask_report is present.
    expect(onStream.showUpload).toBe(false)
  })

  it('latest ask_vitals shows own fields only (no older bank gap mixed in)', () => {
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
      openProfileGaps: ['height', 'age'],
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
    const onBank = buildTurnActionsVisibility({
      message: bank,
      ctx,
      goalOptions: [],
      needsMultiConfirm: false
    })
    expect(onBank.vitalsFields).toEqual([])
  })

  it('bank sex chips do not appear on offer_recommend-only latest', () => {
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
      replyActions: ra({ actions: [VIEW_RECOMMEND_ACTION] })
    })
    const ctx = baseCtx({
      lastAssistantId: 'stream',
      openProfileGaps: ['sex']
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
    expect(onStream.choices).toEqual([])
    expect(onStream.showViewRecommend).toBe(true)
  })

  it('free chips on latest stay visible without bank gap chips mixed in', () => {
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
      openProfileGaps: ['diet']
    })
    const onStream = buildTurnActionsVisibility({
      message: stream,
      ctx,
      goalOptions: [],
      needsMultiConfirm: false
    })
    expect(onStream.choices.map(c => c.code)).toEqual([
      'sleep_ok',
      'sleep_bad'
    ])
  })

  it('consecutive completion CTAs: each latest turn with offer_recommend paints view-recommend', () => {
    const turn1 = assistant('t1', {
      replyActions: ra({ actions: [VIEW_RECOMMEND_ACTION] })
    })
    const turn2 = assistant('t2', {
      replyActions: ra({
        actions: [
          VIEW_RECOMMEND_ACTION,
          {
            type: 'choose_option',
            payload: {
              kind: 'continue_consultation',
              mode: 'single',
              options: [{ code: 'continue', label: '繼續健康諮詢' }]
            }
          }
        ]
      })
    })
    const turn3 = assistant('t3', {
      replyActions: ra({
        actions: [
          VIEW_RECOMMEND_ACTION,
          {
            type: 'choose_option',
            payload: {
              kind: 'open_question_reply',
              mode: 'single',
              options: [
                { code: 'no_more', label: '我沒有問題了' },
                { code: 'suggest', label: '你有什麼建議' }
              ]
            }
          },
          {
            type: 'choose_option',
            payload: {
              kind: 'continue_consultation',
              mode: 'single',
              options: [{ code: 'continue', label: '繼續健康諮詢' }]
            }
          }
        ]
      })
    })

    const asLatest = (id: string) => baseCtx({
      lastAssistantId: id,
      conversationPath: 'B',
      openProfileGaps: []
    })

    expect(buildTurnActionsVisibility({
      message: turn1,
      ctx: asLatest('t1'),
      goalOptions: [],
      needsMultiConfirm: false
    }).showViewRecommend).toBe(true)

    expect(buildTurnActionsVisibility({
      message: turn1,
      ctx: asLatest('t2'),
      goalOptions: [],
      needsMultiConfirm: false
    }).showViewRecommend).toBe(false)

    const onT2 = buildTurnActionsVisibility({
      message: turn2,
      ctx: asLatest('t2'),
      goalOptions: [],
      needsMultiConfirm: false
    })
    expect(onT2.showViewRecommend).toBe(true)
    expect(onT2.choices.map(c => c.code)).toEqual(['continue'])

    const onT3 = buildTurnActionsVisibility({
      message: turn3,
      ctx: asLatest('t3'),
      goalOptions: [],
      needsMultiConfirm: false
    })
    expect(onT3.showViewRecommend).toBe(true)
    expect(onT3.choices.map(c => c.code)).toEqual(['no_more', 'suggest', 'continue'])
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

  it('triad asking visibility: open_question_reply + continue + submit on path B', () => {
    const msg = assistant('latest', {
      replyActions: ra({
        adaptor: 'rule',
        actions: [
          VIEW_RECOMMEND_ACTION,
          {
            type: 'choose_option',
            payload: {
              kind: 'open_question_reply',
              mode: 'single',
              confirm: false,
              options: [
                { code: 'no_more', label: '我沒有問題了' },
                { code: 'suggest', label: '你有什麼建議' }
              ]
            }
          },
          {
            type: 'choose_option',
            payload: {
              kind: 'continue_consultation',
              mode: 'single',
              confirm: false,
              options: [{ code: 'continue', label: '繼續健康諮詢' }]
            }
          }
        ]
      })
    })
    const visibility = buildTurnActionsVisibility({
      message: msg,
      ctx: baseCtx({ lastAssistantId: 'latest', conversationPath: 'B' }),
      goalOptions: [],
      needsMultiConfirm: false,
      expertReviewStatus: 'none'
    })
    expect(visibility.choices.map(c => c.code)).toEqual([
      'no_more',
      'suggest',
      'continue'
    ])
    expect(visibility.showSubmitReview).toBe(false)
    expect(visibility.showViewRecommend).toBe(true)
    expect(visibility.showConfirm).toBe(false)
    expect(isContinueConsultationOption(msg.replyActions, 'continue')).toBe(true)
  })

  it('seq 750 visibility: open_question_reply chips + path_switch b + checkup', () => {
    const msg = assistant('latest', {
      replyActions: ra({
        adaptor: 'rule',
        actions: [
          { type: 'none' },
          {
            type: 'choose_option',
            payload: {
              kind: 'open_question_reply',
              mode: 'single',
              confirm: false,
              options: [
                { code: 'continue', label: '繼續健康諮詢' },
                { code: 'enough', label: '先這樣就好' }
              ]
            }
          },
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
      needsMultiConfirm: false
    })
    expect(visibility.choices.map(choice => choice.code)).toEqual(['continue', 'enough', 'b'])
    expect(visibility.showConfirm).toBe(false)
    expect(visibility.showCheckup).toBe(true)
    expect(visibility.showSubmitReview).toBe(false)
    expect(visibility.replyProjection?.chooseOption?.kind).toBe('open_question_reply')
    expect(isPathSwitchOptionCode(msg.replyActions, 'b')).toBe(true)
    expect(detectPathRuleCopyKind(msg.replyActions)).toBe('path_a_cap')
  })

  it('path C await upload renders ask_report + path_switch (no checkup)', () => {
    const msg = assistant('latest', {
      parts: [{ type: 'text', text: '請上傳血檢或健檢報告' }],
      replyActions: ra({
        adaptor: 'rule',
        actions: [
          { type: 'ask_report', payload: { option_codes: ['upload'] } },
          {
            type: 'choose_option',
            payload: {
              kind: 'path_switch',
              mode: 'single',
              confirm: false,
              options: [
                { code: 'a', label: '我想聊聊' },
                { code: 'b', label: '我想諮詢健康方案' }
              ]
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
    expect(visibility.showCheckup).toBe(false)
    expect(visibility.choices.map(choice => choice.code)).toEqual(['a', 'b'])
    expect(detectPathRuleCopyKind(msg.replyActions)).toBe('path_c_await_upload')
    expect(pathSwitchChipI18nKey('path_c_await_upload')).toBe('chat.pathSwitchToConsult')
  })

  describe('resolvePathSwitchChoiceLabels — empty BE label → i18n, not code', () => {
    const zh = (key: string) => {
      const map: Record<string, string> = {
        'chat.pathSwitchToConsult': '我想諮詢健康方案',
        'chat.pathEntryA': '我想聊聊',
        'chat.pathEntryB': '我想諮詢健康方案',
        'chat.pathEntryC': '幫我看報告'
      }
      return map[key] ?? key
    }

    it('open_question_reply + path_switch empty label → i18n「我想諮詢健康方案」not code b', () => {
      const replyActions = ra({
        adaptor: 'rule',
        actions: [
          {
            type: 'choose_option',
            payload: {
              kind: 'open_question_reply',
              mode: 'single',
              confirm: false,
              options: [
                { code: 'no_more', label: '我沒有問題了' },
                { code: 'suggest', label: '你有什麼建議' }
              ]
            }
          },
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
      const projection = projectReplyActionsToCtas({
        replyActions,
        canShowRecommendSlot: false,
        canShowUpload: false,
        canShowCheckup: true,
        canShowVitals: false,
        expertReviewStatus: 'none'
      })
      // Parser may keep '' or historically fall back to code — both need i18n.
      const rawSwitch = projection.flags.choices.find(c => c.code === 'b')
      expect(rawSwitch).toBeTruthy()
      expect(pathSwitchLabelNeedsI18n(rawSwitch!)).toBe(true)
      expect(pathSwitchOptionI18nKey('path_a_cap', 'b')).toBe('chat.pathSwitchToConsult')

      const localized = resolvePathSwitchChoiceLabels(
        replyActions,
        projection.flags.choices,
        zh
      )
      expect(localized.map(c => ({ code: c.code, label: c.label }))).toEqual([
        { code: 'no_more', label: '我沒有問題了' },
        { code: 'suggest', label: '你有什麼建議' },
        { code: 'b', label: '我想諮詢健康方案' }
      ])
    })

    it('solo path_switch empty label → i18n not code', () => {
      const replyActions = ra({
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
      const projection = projectReplyActionsToCtas({
        replyActions,
        canShowRecommendSlot: false,
        canShowUpload: false,
        canShowCheckup: true,
        canShowVitals: false,
        expertReviewStatus: 'none'
      })
      const localized = resolvePathSwitchChoiceLabels(
        replyActions,
        projection.flags.choices,
        zh
      )
      expect(localized).toEqual([{ code: 'b', label: '我想諮詢健康方案' }])
    })

    it('solo path_switch with label===code fallback still gets i18n', () => {
      const replyActions = ra({
        adaptor: 'rule',
        actions: [
          { type: 'offer_checkup', payload: { url: 'https://example.test/checkup' } },
          {
            type: 'choose_option',
            payload: {
              kind: 'path_switch',
              mode: 'single',
              confirm: false,
              options: [{ code: 'b', label: 'b' }]
            }
          }
        ]
      })
      const localized = resolvePathSwitchChoiceLabels(
        replyActions,
        [{ code: 'b', label: 'b' }],
        zh
      )
      expect(localized[0]?.label).toBe('我想諮詢健康方案')
    })

    it('path C empty a／b labels → pathEntryA／pathEntryB i18n', () => {
      const replyActions = ra({
        adaptor: 'rule',
        actions: [
          { type: 'ask_report', payload: { option_codes: ['upload'] } },
          {
            type: 'choose_option',
            payload: {
              kind: 'path_switch',
              mode: 'single',
              confirm: false,
              options: [
                { code: 'a', label: '' },
                { code: 'b', label: '' }
              ]
            }
          }
        ]
      })
      expect(pathSwitchOptionI18nKey('path_c_await_upload', 'a')).toBe('chat.pathEntryA')
      expect(pathSwitchOptionI18nKey('path_c_await_upload', 'b')).toBe('chat.pathEntryB')
      const localized = resolvePathSwitchChoiceLabels(
        replyActions,
        [
          { code: 'a', label: '' },
          { code: 'b', label: '' }
        ],
        zh
      )
      expect(localized).toEqual([
        { code: 'a', label: '我想聊聊' },
        { code: 'b', label: '我想諮詢健康方案' }
      ])
    })

    it('empty path_switch label via real zh-TW locale never shows key string', async () => {
      const locale = (await import('../../i18n/locales/zh-TW.json')).default as {
        chat: Record<string, string>
      }
      const translate = (key: string) => {
        const short = key.startsWith('chat.') ? key.slice('chat.'.length) : key
        return locale.chat[short] ?? key
      }
      // Guard: pathEntry* must exist so missing-key fallback cannot leak.
      expect(locale.chat.pathEntryA).toBeTruthy()
      expect(locale.chat.pathEntryB).toBeTruthy()
      expect(locale.chat.pathEntryC).toBeTruthy()
      expect(locale.chat.pathSwitchToConsult).toBeTruthy()

      const replyActions = ra({
        adaptor: 'rule',
        actions: [
          { type: 'ask_report', payload: { option_codes: ['upload'] } },
          {
            type: 'choose_option',
            payload: {
              kind: 'path_switch',
              mode: 'single',
              confirm: false,
              options: [
                { code: 'a', label: '' },
                { code: 'b', label: '' },
                { code: 'c', label: '' }
              ]
            }
          }
        ]
      })
      const localized = resolvePathSwitchChoiceLabels(
        replyActions,
        [
          { code: 'a', label: '' },
          { code: 'b', label: '' },
          { code: 'c', label: '' }
        ],
        translate
      )
      for (const choice of localized) {
        expect(choice.label).not.toMatch(/^chat\./)
        expect(choice.label).not.toBe(choice.code)
        expect(choice.label.length).toBeGreaterThan(0)
      }
      expect(localized.map(c => c.label)).toEqual([
        locale.chat.pathEntryA,
        locale.chat.pathEntryB,
        locale.chat.pathEntryC
      ])
    })

    it('non-empty core label wins over i18n', () => {
      const replyActions = ra({
        adaptor: 'rule',
        actions: [
          { type: 'offer_checkup', payload: { url: 'https://example.test/checkup' } },
          {
            type: 'choose_option',
            payload: {
              kind: 'path_switch',
              mode: 'single',
              confirm: false,
              options: [{ code: 'b', label: '進行健康諮詢' }]
            }
          }
        ]
      })
      const localized = resolvePathSwitchChoiceLabels(
        replyActions,
        [{ code: 'b', label: '進行健康諮詢' }],
        zh
      )
      expect(localized[0]?.label).toBe('進行健康諮詢')
    })
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
      ctx: baseCtx({ lastAssistantId: 'latest' }),
      intake: msg,
      goalOptions: [],
      needsMultiConfirm: true
    })
    expect(v.fromReplyActions).toBe(true)
    expect(v.choices.map(c => c.code)).toEqual(['none', 'within_6m'])
    expect(v.showConfirm).toBe(false)
  })
})
