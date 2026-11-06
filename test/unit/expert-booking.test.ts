import { describe, expect, it } from 'vitest'
import {
  draftToExpertBookingPayload,
  draftToOrderCreateRequest,
  emptyExpertBookingDraft,
  expertBookingFormSchema,
  expertBookingStatusI18nKey,
  expertBookingStatusTone,
  EXPERT_BOOKING_PRODUCT_CODE,
  formatConfirmedAtLabel,
  formatSlotRangeLabel,
  isExpertBookingOrder,
  parseExpertBookingOnOrder,
  slotDraftToPreferredLabel
} from '../../app/utils/expert-booking'
import {
  isOfferExpertBookingAction,
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
  it('accepts 1–3 valid slots; requirement_note／LINE／attachments optional', () => {
    const ok = expertBookingFormSchema.safeParse({
      contactName: '王小明',
      phone: '0912345678',
      email: 'wang@example.com',
      lineId: 'wang.line',
      slots: [{
        date: '2026-11-12',
        startTime: '14:00',
        endTime: '16:00'
      }],
      requirements: '',
      attachments: [{
        key: 'eb/att-1',
        filename: 'lab.pdf',
        content_type: 'application/pdf',
        size_bytes: 1200
      }]
    })
    expect(ok.success).toBe(true)

    const missingSlots = expertBookingFormSchema.safeParse({
      ...emptyExpertBookingDraft('a@b.com'),
      contactName: 'x',
      phone: '0912345678',
      slots: []
    })
    expect(missingSlots.success).toBe(false)
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

  it('maps draft to POST /orders body (OpenAPI 27901b4 field names)', () => {
    const draft = {
      contactName: '王小明',
      phone: '0912-345-678',
      email: 'wang@example.com',
      lineId: 'my.line',
      slots: [{
        date: '2026-11-12',
        startTime: '14:00',
        endTime: '16:00'
      }],
      requirements: '想討論減重與作息',
      attachments: [{
        key: 'eb/att-1',
        filename: 'lab.pdf',
        content_type: 'application/pdf' as const,
        size_bytes: 2048
      }]
    }
    const payload = draftToExpertBookingPayload(draft)
    expect(payload.contact_name).toBe('王小明')
    expect(payload.contact_phone).toBe('0912-345-678')
    expect(payload.contact_email).toBe('wang@example.com')
    expect(payload.contact_line).toBe('my.line')
    expect(payload.requirement_note).toBe('想討論減重與作息')
    expect(payload.attachments).toHaveLength(1)
    expect(payload.preferred_slots).toHaveLength(1)
    expect(typeof payload.preferred_slots[0]).toBe('string')
    expect(payload.preferred_slots[0]).toBe(
      slotDraftToPreferredLabel(draft.slots[0]!)
    )

    const body = draftToOrderCreateRequest(draft, {
      invoiceCarrier: 'wang@example.com'
    })
    expect(body.lines).toEqual([{
      kind: 'expert_booking',
      expert_booking_code: EXPERT_BOOKING_PRODUCT_CODE
    }])
    expect(body.expert_booking).toEqual(payload)
    expect(body.invoice_carrier).toBe('wang@example.com')
    expect(body.recipient.address).toBeNull()
    expect(body.payment_method).toBe('card')
    expect(body.conversation_id).toBeUndefined()

    const bound = draftToOrderCreateRequest(draft, {
      invoiceCarrier: 'wang@example.com',
      conversationId: ' 11111111-1111-4111-8111-111111111111 '
    })
    expect(bound.conversation_id).toBe('11111111-1111-4111-8111-111111111111')
  })

  it('omits empty optional LINE／attachments／requirement_note as null／undefined', () => {
    const payload = draftToExpertBookingPayload({
      ...emptyExpertBookingDraft('a@b.com'),
      contactName: 'A',
      phone: '0912345678',
      slots: [{
        date: '2026-11-12',
        startTime: '10:00',
        endTime: '11:00'
      }]
    })
    expect(payload.contact_line).toBeNull()
    expect(payload.requirement_note).toBeNull()
    expect(payload.attachments).toBeUndefined()
  })
})

describe('expert-booking order display helpers', () => {
  it('parses order expert_booking payload (string slots／product_picks)', () => {
    const parsed = parseExpertBookingOnOrder({
      id: 'eb-1',
      status: 'scheduled',
      contact_name: '王小明',
      contact_phone: '0912345678',
      contact_email: 'wang@example.com',
      contact_line: 'wang.line',
      preferred_slots: ['11/12（四） 14:00–16:00'],
      requirement_note: '減重',
      attachments: [{
        key: 'eb/att-1',
        filename: 'lab.pdf',
        content_type: 'application/pdf',
        size_bytes: 100
      }],
      confirmed_starts_at: '2026-11-12T15:00:00+08:00',
      confirmed_ends_at: '2026-11-12T16:00:00+08:00',
      product_picks: [{
        id: 'pick-1',
        sellable_item_id: 's1',
        sellable_item_name: 'Magnesium 6 in 1',
        reason: '協助放鬆與睡眠品質',
        sort_order: 0
      }]
    })
    expect(parsed?.status).toBe('scheduled')
    expect(parsed?.preferred_slots[0]).toContain('14:00')
    expect(parsed?.product_picks[0]?.sellable_item_name).toContain('Magnesium')
    expect(parsed?.attachments[0]?.key).toBe('eb/att-1')
    expect(isExpertBookingOrder({
      expert_booking: parsed,
      lines: [{ kind: 'expert_booking' }]
    })).toBe(true)
    expect(isExpertBookingOrder({ lines: [{ kind: 'package' }] })).toBe(false)
  })

  it('maps status i18n／tone and formats confirmed time', () => {
    expect(expertBookingStatusI18nKey('awaiting_schedule')).toBe(
      'expertBooking.status.awaiting_schedule'
    )
    expect(expertBookingStatusTone('awaiting_schedule')).toBe('pending')
    expect(expertBookingStatusTone('scheduled')).toBe('info')
    expect(formatConfirmedAtLabel(
      '2026-11-12T15:00:00+08:00',
      '2026-11-12T16:00:00+08:00'
    )).toBeTruthy()
    expect(formatSlotRangeLabel(
      '2026-11-12T14:00:00+08:00',
      '2026-11-12T16:00:00+08:00'
    )).toContain('14')
  })
})

describe('expert_booking_unavailable', () => {
  it('detects GET 404／POST 409 expert_booking_unavailable', async () => {
    const { isExpertBookingUnavailableError } = await import(
      '../../app/utils/expert-booking-unavailable'
    )
    const { CandorApiError } = await import('../../app/utils/candor-api')

    expect(isExpertBookingUnavailableError(
      new CandorApiError('gone', 404, 'expert_booking_unavailable')
    )).toBe(true)
    expect(isExpertBookingUnavailableError(
      new CandorApiError('conflict', 409, 'expert_booking_unavailable')
    )).toBe(true)
    expect(isExpertBookingUnavailableError(
      new CandorApiError('missing', 404, 'not_found')
    )).toBe(true)
    expect(isExpertBookingUnavailableError(
      new CandorApiError('conflict', 409, 'conversation_already_ordered')
    )).toBe(false)
    expect(isExpertBookingUnavailableError(
      new CandorApiError('oops', 500, 'unknown')
    )).toBe(false)
    expect(isExpertBookingUnavailableError(new Error('x'))).toBe(false)
  })
})

describe('offer_expert_booking CTA projection (C10)', () => {
  it('requires mode=book_expert', () => {
    expect(isOfferExpertBookingAction({
      type: 'offer_expert_booking',
      payload: { label: '預約專家諮詢' }
    })).toBe(false)
    expect(isOfferExpertBookingAction({
      type: 'offer_expert_booking',
      payload: { mode: 'book_expert', label: '預約專家諮詢' }
    })).toBe(true)
  })

  it('projects showExpertBooking with default path when core sends the action', () => {
    const projection = projectReplyActionsToCtas({
      replyActions: ra({
        actions: [{
          type: 'offer_expert_booking',
          payload: { mode: 'book_expert', label: '預約專家諮詢' }
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
        actions: [{
          type: 'offer_expert_booking',
          payload: { mode: 'book_expert' }
        }]
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
