import { describe, expect, it } from 'vitest'
import {
  draftToCreateBody,
  emptyExpertBookingDraft,
  emptyExpertBookingSlot,
  expertBookingFormSchema,
  expertBookingStatusI18nKey,
  expertBookingStatusTone,
  EXPERT_BOOKING_PRICE_TWD,
  formatConfirmedAtLabel,
  formatSlotRangeLabel,
  isExpertBookingOrder,
  parseExpertBookingOnOrder,
  slotDraftToIso
} from '../../app/utils/expert-booking'
import {
  OFFER_EXPERT_BOOKING_DEFAULT_PATH,
  projectReplyActionsToCtas,
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

describe('expert-booking form／slots', () => {
  it('accepts 1–3 valid slots and rejects empty requirements', () => {
    const ok = expertBookingFormSchema.safeParse({
      contactName: '王小明',
      phone: '0912345678',
      email: 'wang@example.com',
      lineId: '',
      slots: [{
        date: '2026-11-12',
        startTime: '14:00',
        endTime: '16:00'
      }],
      requirements: '想討論減重',
      attachmentNames: [],
      attachmentIds: []
    })
    expect(ok.success).toBe(true)

    const bad = expertBookingFormSchema.safeParse({
      ...emptyExpertBookingDraft('a@b.com'),
      contactName: 'x',
      phone: '0912345678',
      slots: [emptyExpertBookingSlot()],
      requirements: ''
    })
    expect(bad.success).toBe(false)
  })

  it('rejects endTime before startTime', () => {
    const bad = expertBookingFormSchema.safeParse({
      contactName: '王小明',
      phone: '0912345678',
      email: 'wang@example.com',
      slots: [{
        date: '2026-11-12',
        startTime: '16:00',
        endTime: '14:00'
      }],
      requirements: '需求'
    })
    expect(bad.success).toBe(false)
  })

  it('maps draft slots to ISO create body', () => {
    const body = draftToCreateBody({
      contactName: '王小明',
      phone: '0912-345-678',
      email: 'wang@example.com',
      lineId: '',
      slots: [{
        date: '2026-11-12',
        startTime: '14:00',
        endTime: '16:00'
      }],
      requirements: '想討論減重與作息',
      attachmentNames: [],
      attachmentIds: []
    })
    expect(body.contact_name).toBe('王小明')
    expect(body.preferred_slots[0]).toEqual(slotDraftToIso({
      date: '2026-11-12',
      startTime: '14:00',
      endTime: '16:00'
    }))
    expect(body.preferred_slots[0]?.start_at).toContain('2026-11-12T14:00:00')
    expect(EXPERT_BOOKING_PRICE_TWD).toBe(6000)
  })
})

describe('expert-booking order display helpers', () => {
  it('parses order expert_booking payload and detects kind', () => {
    const parsed = parseExpertBookingOnOrder({
      id: 'eb-1',
      status: 'scheduled',
      confirmed_at: '2026-11-12T15:00:00+08:00',
      preferred_slots: [{
        start_at: '2026-11-12T14:00:00+08:00',
        end_at: '2026-11-12T16:00:00+08:00'
      }],
      requirements: '減重',
      product_recommendations: [{
        sellable_item_id: 's1',
        sellable_item_name: 'Magnesium 6 in 1',
        reason: '協助放鬆與睡眠品質'
      }]
    })
    expect(parsed?.status).toBe('scheduled')
    expect(parsed?.product_recommendations?.[0]?.sellable_item_name).toContain('Magnesium')
    expect(isExpertBookingOrder({
      expert_booking: parsed,
      lines: [{ kind: 'expert_booking' }]
    })).toBe(true)
    expect(isExpertBookingOrder({ lines: [{ kind: 'package' }] })).toBe(false)
  })

  it('maps status i18n／tone and formats confirmed time', () => {
    expect(expertBookingStatusI18nKey('pending_schedule')).toBe(
      'expertBooking.status.pending_schedule'
    )
    expect(expertBookingStatusTone('pending_schedule')).toBe('pending')
    expect(expertBookingStatusTone('scheduled')).toBe('info')
    expect(formatConfirmedAtLabel('2026-11-12T15:00:00+08:00')).toBeTruthy()
    expect(formatSlotRangeLabel(
      '2026-11-12T14:00:00+08:00',
      '2026-11-12T16:00:00+08:00'
    )).toContain('14')
  })
})

describe('offer_expert_booking CTA projection (C10)', () => {
  it('projects showExpertBooking with default path when core sends the action', () => {
    const projection = projectReplyActionsToCtas({
      replyActions: ra({
        actions: [{
          type: 'offer_expert_booking',
          payload: { label: '預約專家諮詢' }
        }]
      }),
      canShowRecommendSlot: true,
      canShowUpload: true,
      canShowCheckup: true,
      canShowVitals: true,
      expertReviewStatus: 'none'
    })
    expect(projection.flags.showExpertBooking).toBe(true)
    expect(projection.flags.showViewRecommend).toBe(false)
    expect(projection.expertBookingPathOverride).toBe(OFFER_EXPERT_BOOKING_DEFAULT_PATH)
    expect(projection.expertBookingLabelOverride).toBe('預約專家諮詢')
  })

  it('turn visibility paints expert booking CTA on latest assistant', () => {
    const msg = assistant('latest', {
      replyActions: ra({
        actions: [{ type: 'offer_expert_booking', payload: {} }]
      })
    })
    const v = buildTurnActionsVisibility({
      message: msg,
      ctx: baseCtx(),
      goalOptions: [],
      needsMultiConfirm: false
    })
    expect(v.showExpertBooking).toBe(true)
    expect(v.expertBookingPathOverride).toBe('/expert-booking')
  })

  it('does not invent expert booking CTA when reply_actions is intentional none', () => {
    const msg = assistant('latest', {
      replyActions: ra({
        actions: [{ type: 'none', payload: {} }]
      })
    })
    const v = buildTurnActionsVisibility({
      message: msg,
      ctx: baseCtx(),
      goalOptions: [],
      needsMultiConfirm: false
    })
    expect(v.showExpertBooking).toBe(false)
    expect(v.fromReplyActions).toBe(true)
  })
})
