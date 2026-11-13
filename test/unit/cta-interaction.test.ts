import { describe, expect, it } from 'vitest'
import { CandorApiError } from '../../app/utils/candor-api'
import {
  isStaleCtaError,
  resolveOptionControlStatus,
  resolveReplyActionsAsHistorical,
  selectedCodesFromReplyActions
} from '../../app/utils/cta-interaction'
import type { ChatMessage } from '../../app/utils/first-order'
import { parseReplyActions } from '../../app/utils/reply-actions'
import { buildTurnActionsVisibility } from '../../app/utils/chat-turn-actions'
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
})
