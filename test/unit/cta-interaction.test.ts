import { describe, expect, it } from 'vitest'
import { CandorApiError } from '../../app/utils/candor-api'
import {
  coerceRetainedStatusForNonLatest,
  isStaleCtaError,
  resolveEntryPathSwitchResolution,
  resolveOptionControlStatus,
  resolveReplyActionsAsHistorical,
  selectedCodesFromReplyActions
} from '../../app/utils/cta-interaction'
import type { ChatMessage } from '../../app/utils/first-order'
import { parseReplyActions } from '../../app/utils/reply-actions'
import {
  buildTurnActionsVisibility,
  freezeNonLatestRetainedVisibility
} from '../../app/utils/chat-turn-actions'
import type { ChatTurnUiContext } from '../../app/utils/chat-turn-actions'

const baseCtx = (lastId: string): ChatTurnUiContext => ({
  readonlyMode: false,
  escalated: false,
  pending: false,
  goalSelectActive: false,
  reportAskActive: false,
  hasReportAnalysis: false,
  reportRetry: false,
  checkupLinkReady: true,
  lastAssistantId: lastId,
  conversationPath: 'B',
  openProfileGaps: [],
  pathEntryPending: false
})

function pathSwitchRa(interaction?: {
  round_status: 'current' | 'historical'
  outcome: null | 'option_selected' | 'free_text'
}, optionStatuses?: Record<string, 'current' | 'selected' | 'disabled'>) {
  return parseReplyActions({
    schema_version: '0.1',
    source: 'path_entry',
    adaptor: 'fake',
    degraded: false,
    error: null,
    ...(interaction ? { interaction } : {}),
    actions: [{
      type: 'choose_option',
      payload: {
        kind: 'path_switch',
        mode: 'single',
        confirm: false,
        options: [
          { code: 'a', label: '我想聊聊', status: optionStatuses?.a },
          { code: 'b', label: '我想諮詢健康方案', status: optionStatuses?.b },
          { code: 'c', label: '幫我看報告', status: optionStatuses?.c }
        ]
      }
    }]
  })!
}

describe('cta-interaction helpers', () => {
  it('isStaleCtaError matches 409 stale_cta only', () => {
    expect(isStaleCtaError(new CandorApiError('stale', 409, 'stale_cta'))).toBe(true)
    expect(isStaleCtaError(new CandorApiError('x', 409, 'conversation_already_ordered'))).toBe(false)
    expect(isStaleCtaError(new CandorApiError('x', 400, 'stale_cta'))).toBe(false)
  })

  it('resolveOptionControlStatus respects forceDisabled and historical fallback', () => {
    expect(resolveOptionControlStatus('current', 'current')).toBe('current')
    expect(resolveOptionControlStatus('selected', 'historical')).toBe('selected')
    expect(resolveOptionControlStatus(null, 'historical')).toBe('disabled')
    // Lingering `current` on a historical round must grey out (run21).
    expect(resolveOptionControlStatus('current', 'historical')).toBe('disabled')
    expect(resolveOptionControlStatus('current', 'current', { forceDisabled: true })).toBe('disabled')
  })

  it('parseReplyActions keeps interaction + option status', () => {
    const ra = pathSwitchRa(
      { round_status: 'historical', outcome: 'option_selected' },
      { a: 'disabled', b: 'selected', c: 'disabled' }
    )
    expect(ra.interaction).toEqual({
      round_status: 'historical',
      outcome: 'option_selected'
    })
    expect(selectedCodesFromReplyActions(ra)).toEqual(['b'])
  })

  it('resolveReplyActionsAsHistorical stamps selected／disabled without stripping RA', () => {
    const message: ChatMessage = {
      id: 'asst-1',
      role: 'assistant',
      parts: [{ type: 'text', text: '你想先從哪裡開始？' }],
      replyActions: pathSwitchRa({ round_status: 'current', outcome: null })
    }
    resolveReplyActionsAsHistorical(message, {
      outcome: 'option_selected',
      selectedCodes: ['b']
    })
    expect(message.replyActions?.interaction?.round_status).toBe('historical')
    expect(selectedCodesFromReplyActions(message.replyActions)).toEqual(['b'])
    const options = message.replyActions!.actions[0]!.payload!.options as Array<{
      code: string
      status: string
    }>
    expect(options.find(o => o.code === 'b')?.status).toBe('selected')
    expect(options.find(o => o.code === 'a')?.status).toBe('disabled')
  })

  it('Path A open_question_reply chip tap stamps selected (not free_text disabled)', () => {
    const message: ChatMessage = {
      id: 'asst-a',
      role: 'assistant',
      parts: [{ type: 'text', text: '睡眠怎麼樣？' }],
      replyActions: parseReplyActions({
        schema_version: '0.1',
        source: 'rule',
        adaptor: 'rule',
        degraded: false,
        error: null,
        interaction: { round_status: 'current', outcome: null },
        actions: [{
          type: 'choose_option',
          payload: {
            kind: 'open_question_reply',
            mode: 'single',
            confirm: false,
            options: [
              { code: 'sleep', label: '睡眠品質' },
              { code: 'insomnia', label: '入睡困難，躺很久才睡得著' }
            ],
            selected: [],
            gap_code: null,
            answer_type: null,
            exclusive_codes: []
          }
        }]
      })
    }
    resolveReplyActionsAsHistorical(message, {
      outcome: 'option_selected',
      selectedCodes: ['sleep']
    })
    expect(selectedCodesFromReplyActions(message.replyActions)).toEqual(['sleep'])
    const visibility = buildTurnActionsVisibility({
      message,
      ctx: { ...baseCtx('later'), conversationPath: 'A' },
      goalOptions: [],
      needsMultiConfirm: false
    })
    expect(visibility.choices.find(c => c.code === 'sleep')?.status).toBe('selected')
    expect(visibility.choices.find(c => c.code === 'insomnia')?.status).toBe('disabled')
  })

  it('Path C await_upload free_text grey-retain keeps chips when non-latest', () => {
    const message: ChatMessage = {
      id: 'await-upload',
      role: 'assistant',
      parts: [{ type: 'text', text: '請上傳血檢或健檢報告' }],
      replyActions: parseReplyActions({
        schema_version: '0.1',
        source: 'rule',
        adaptor: 'rule',
        degraded: false,
        error: null,
        actions: [
          { type: 'ask_report', payload: {} },
          {
            type: 'choose_option',
            payload: {
              kind: 'path_switch',
              mode: 'single',
              confirm: false,
              options: [
                { code: 'a', label: '我想聊聊' },
                { code: 'b', label: '我想諮詢健康方案' }
              ],
              selected: [],
              gap_code: null,
              answer_type: null,
              exclusive_codes: []
            }
          }
        ]
      })
    }
    resolveReplyActionsAsHistorical(message, { outcome: 'free_text' })
    const visibility = buildTurnActionsVisibility({
      message,
      ctx: { ...baseCtx('newer'), conversationPath: 'C', hasReportAnalysis: true },
      goalOptions: [],
      needsMultiConfirm: false
    })
    expect(visibility.choices.map(c => c.code)).toEqual(['a', 'b'])
    expect(visibility.choices.every(c => c.status === 'disabled')).toBe(true)
    expect(visibility.showUpload).toBe(true)
    expect(visibility.roundStatus).toBe('historical')
  })

  it('resolveEntryPathSwitchResolution: chip A／C selected; free text all grey', () => {
    expect(resolveEntryPathSwitchResolution('a')).toEqual({
      outcome: 'option_selected',
      selectedCodes: ['a']
    })
    expect(resolveEntryPathSwitchResolution('c')).toEqual({
      outcome: 'option_selected',
      selectedCodes: ['c']
    })
    expect(resolveEntryPathSwitchResolution('a', 'free_text')).toEqual({
      outcome: 'free_text'
    })
  })

  it('route A／C opening path_switch stays visible after historical stamp', () => {
    for (const code of ['a', 'c'] as const) {
      const message: ChatMessage = {
        id: `asst-${code}`,
        role: 'assistant',
        parts: [{ type: 'text', text: '想先從哪裡開始？' }],
        replyActions: pathSwitchRa({ round_status: 'current', outcome: null })
      }
      resolveReplyActionsAsHistorical(
        message,
        resolveEntryPathSwitchResolution(code)
      )
      const visibility = buildTurnActionsVisibility({
        message,
        ctx: { ...baseCtx('later'), conversationPath: code.toUpperCase() as 'A' | 'C' },
        goalOptions: [],
        needsMultiConfirm: false
      })
      expect(visibility.choices.map(c => c.code)).toEqual(['a', 'b', 'c'])
      expect(visibility.choices.find(c => c.code === code)?.status).toBe('selected')
      expect(visibility.choices.filter(c => c.code !== code).every(c => c.status === 'disabled')).toBe(true)
      expect(visibility.roundStatus).toBe('historical')
    }
  })
})

describe('buildTurnActionsVisibility — grey retain', () => {
  it('compat: without interaction, non-latest RA stays hidden', () => {
    const old = {
      id: 'old',
      role: 'assistant' as const,
      parts: [{ type: 'text' as const, text: 'old' }],
      replyActions: pathSwitchRa()
    }
    const latest = {
      id: 'new',
      role: 'assistant' as const,
      parts: [{ type: 'text' as const, text: 'new' }],
      replyActions: pathSwitchRa()
    }
    const visibility = buildTurnActionsVisibility({
      message: old,
      ctx: baseCtx('new'),
      goalOptions: [],
      needsMultiConfirm: false
    })
    expect(visibility.choices).toEqual([])
    void latest
  })

  it('with interaction historical: non-latest keeps chips selected／disabled', () => {
    const historical = {
      id: 'old',
      role: 'assistant' as const,
      parts: [{ type: 'text' as const, text: '你想先從哪裡開始？' }],
      replyActions: pathSwitchRa(
        { round_status: 'historical', outcome: 'option_selected' },
        { a: 'disabled', b: 'selected', c: 'disabled' }
      )
    }
    const latest = {
      id: 'new',
      role: 'assistant' as const,
      parts: [{ type: 'text' as const, text: '好' }],
      replyActions: null
    }
    const visibility = buildTurnActionsVisibility({
      message: historical,
      ctx: baseCtx('new'),
      goalOptions: [],
      needsMultiConfirm: false
    })
    expect(visibility.choices.map(c => c.code)).toEqual(['a', 'b', 'c'])
    expect(visibility.choices.find(c => c.code === 'b')?.status).toBe('selected')
    expect(visibility.roundStatus).toBe('historical')
    void latest
  })

  it('vitals historical with stored value projects locked card fields', () => {
    const ra = parseReplyActions({
      schema_version: '0.1',
      interaction: { round_status: 'historical', outcome: 'option_selected' },
      actions: [{
        type: 'ask_vitals',
        payload: {
          fields: ['age'],
          gap_code: 'age',
          status: 'selected',
          has_stored_value: true,
          stored_value: 36
        }
      }]
    })!
    const message = {
      id: 'age-1',
      role: 'assistant' as const,
      parts: [{ type: 'text' as const, text: '請問你的年紀是？' }],
      replyActions: ra
    }
    const visibility = buildTurnActionsVisibility({
      message,
      ctx: baseCtx('later'),
      goalOptions: [],
      needsMultiConfirm: false
    })
    expect(visibility.vitalsFields).toEqual(['age'])
    expect(visibility.vitalsStatus).toBe('selected')
    expect(visibility.vitalsHasStoredValue).toBe(true)
    expect(visibility.vitalsStoredValue).toBe(36)
  })

  it('vitals free_text unstored projects empty grey card', () => {
    const ra = parseReplyActions({
      schema_version: '0.1',
      interaction: { round_status: 'historical', outcome: 'free_text' },
      actions: [{
        type: 'ask_vitals',
        payload: {
          fields: ['age'],
          gap_code: 'age',
          status: 'disabled',
          has_stored_value: false,
          stored_value: null
        }
      }]
    })!
    const message = {
      id: 'age-2',
      role: 'assistant' as const,
      parts: [{ type: 'text' as const, text: '請問你的年紀是？' }],
      replyActions: ra
    }
    const visibility = buildTurnActionsVisibility({
      message,
      ctx: baseCtx('later'),
      goalOptions: [],
      needsMultiConfirm: false
    })
    expect(visibility.vitalsStatus).toBe('disabled')
    expect(visibility.vitalsHasStoredValue).toBe(false)
    expect(visibility.vitalsStoredValue).toBeNull()
  })

  it('non-latest lingering current ask_vitals freezes to historical／non-interactive', () => {
    // Core lag／hydrate may leave round_status current on an older weight card
    // after the diet question arrives — FE must still lock the keypad (run21).
    const ra = parseReplyActions({
      schema_version: '0.1',
      interaction: { round_status: 'current', outcome: null },
      actions: [{
        type: 'ask_vitals',
        payload: {
          fields: ['weight'],
          gap_code: 'weight',
          status: 'current'
        }
      }]
    })!
    const older = {
      id: 'weight-1',
      role: 'assistant' as const,
      parts: [{ type: 'text' as const, text: '請問體重？' }],
      replyActions: ra
    }
    const visibility = buildTurnActionsVisibility({
      message: older,
      ctx: baseCtx('diet-1'),
      goalOptions: [],
      needsMultiConfirm: false
    })
    expect(visibility.vitalsFields).toEqual(['weight'])
    expect(visibility.roundStatus).toBe('historical')
    expect(visibility.vitalsStatus).toBe('disabled')
  })

  it('answered non-latest vitals keep selected＋stored; latest unanswered stays current', () => {
    const answeredRa = parseReplyActions({
      schema_version: '0.1',
      interaction: { round_status: 'historical', outcome: 'option_selected' },
      actions: [{
        type: 'ask_vitals',
        payload: {
          fields: ['weight'],
          gap_code: 'weight',
          status: 'selected',
          has_stored_value: true,
          stored_value: 70
        }
      }]
    })!
    const liveRa = parseReplyActions({
      schema_version: '0.1',
      interaction: { round_status: 'current', outcome: null },
      actions: [{
        type: 'ask_vitals',
        payload: {
          fields: ['height'],
          gap_code: 'height',
          status: 'current'
        }
      }]
    })!
    const answered = buildTurnActionsVisibility({
      message: {
        id: 'weight-done',
        role: 'assistant',
        parts: [{ type: 'text', text: '體重？' }],
        replyActions: answeredRa
      },
      ctx: baseCtx('height-live'),
      goalOptions: [],
      needsMultiConfirm: false
    })
    expect(answered.roundStatus).toBe('historical')
    expect(answered.vitalsStatus).toBe('selected')
    expect(answered.vitalsStoredValue).toBe(70)

    const live = buildTurnActionsVisibility({
      message: {
        id: 'height-live',
        role: 'assistant',
        parts: [{ type: 'text', text: '身高？' }],
        replyActions: liveRa
      },
      ctx: baseCtx('height-live'),
      goalOptions: [],
      needsMultiConfirm: false
    })
    expect(live.roundStatus).toBe('current')
    expect(live.vitalsStatus).toBe('current')
    expect(live.vitalsFields).toEqual(['height'])
  })

  it('freezeNonLatestRetainedVisibility greys chips without changing selected', () => {
    expect(coerceRetainedStatusForNonLatest('current')).toBe('disabled')
    expect(coerceRetainedStatusForNonLatest('selected')).toBe('selected')
    const frozen = freezeNonLatestRetainedVisibility({
      choices: [
        { code: 'a', label: 'A', status: 'current' },
        { code: 'b', label: 'B', status: 'selected' }
      ],
      showConfirm: true,
      showUpload: false,
      showCheckup: false,
      showFullTest: false,
      showExpertBooking: false,
      showWantMoreTests: false,
      showRecommend: false,
      showSubmitReview: false,
      showViewRecommend: false,
      showRetry: false,
      vitalsFields: ['weight'],
      vitalsGapCode: 'weight',
      vitalsStatus: 'current',
      vitalsHasStoredValue: true,
      vitalsStoredValue: 70,
      confirmStatus: 'current',
      roundStatus: 'current',
      checkupUrlOverride: null,
      fullTestUrlOverride: null,
      fullTestLabelOverride: null,
      fullTestCopyOverride: null,
      fullTestMarkerCount: null,
      expertBookingPathOverride: null,
      expertBookingLabelOverride: null,
      fromReplyActions: true,
      exclusiveCodes: [],
      replyProjection: null
    })
    expect(frozen.roundStatus).toBe('historical')
    expect(frozen.choices.find(c => c.code === 'a')?.status).toBe('disabled')
    expect(frozen.choices.find(c => c.code === 'b')?.status).toBe('selected')
    expect(frozen.vitalsStatus).toBe('selected')
    expect(frozen.confirmStatus).toBe('disabled')
  })
})
