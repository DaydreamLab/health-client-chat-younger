/**
 * 預約專家（expert_booking）— 對齊 candor-core PR #155 head 27901b4
 * OpenAPI public + docs/spec/34-expert-booking.md。
 */

import { z } from 'zod'
import type {
  CandorInvoiceType,
  CandorPaymentMethod,
  OrderCreateRequest
} from './candor-api'

/** 獨立商品 NT$6,000（含稅整數元）。 */
export const EXPERT_BOOKING_PRICE_TWD = 6000

/** expert_booking_products.code 預設（OpenAPI／spec 34）。 */
export const EXPERT_BOOKING_PRODUCT_CODE = 'personal'

export type ExpertBookingAttachmentContentType
  = 'application/pdf'
    | 'image/jpeg'
    | 'image/png'
    | 'image/webp'

/** POST /expert-booking-attachments 回應；亦用於 orders.expert_booking.attachments。 */
export interface ExpertBookingAttachment {
  key: string
  filename: string
  content_type: ExpertBookingAttachmentContentType
  size_bytes: number
}

/** 服務狀態（與付款狀態分開；spec 34）。 */
export type ExpertBookingServiceStatus
  = 'awaiting_schedule'
    | 'scheduled'
    | 'completed'
    | 'cancelled'

/** GET /order/{id} → expert_booking.product_picks[] */
export interface ExpertBookingProductPick {
  id: string
  sellable_item_id: string
  sellable_item_code?: string | null
  sellable_item_name?: string | null
  reason: string
  sort_order: number
}

/** GET /order/{id} → expert_booking（客人可見；無服務紀錄）。 */
export interface ExpertBookingOnOrder {
  id: string
  status: ExpertBookingServiceStatus
  contact_name?: string
  contact_phone?: string
  contact_email?: string
  contact_line?: string | null
  preferred_slots: string[]
  requirement_note?: string | null
  attachments: ExpertBookingAttachment[]
  confirmed_starts_at?: string | null
  confirmed_ends_at?: string | null
  product_picks: ExpertBookingProductPick[]
  created_at?: string | null
  updated_at?: string | null
}

/** GET /expert-booking-product */
export interface ExpertBookingProduct {
  code: string
  name_zh: string
  name_en?: string | null
  description?: string | null
  price: number
}

/**
 * POST /orders 的 `expert_booking` 物件。
 * 必填：contact_name／contact_phone／contact_email／preferred_slots（1–3 字串）。
 * 選填：contact_line／requirement_note／attachments。
 */
export interface ExpertBookingOrderPayload {
  contact_name: string
  contact_phone: string
  contact_email: string
  contact_line?: string | null
  preferred_slots: string[]
  requirement_note?: string | null
  attachments?: ExpertBookingAttachment[]
}

/** 表單草稿時段（送出時序列化為 preferred_slots 字串）。 */
export interface ExpertBookingDraftSlot {
  /** `YYYY-MM-DD` */
  date: string
  /** `HH:mm` */
  startTime: string
  /** `HH:mm` */
  endTime: string
}

export interface ExpertBookingDraft {
  contactName: string
  phone: string
  email: string
  lineId: string
  slots: ExpertBookingDraftSlot[]
  requirements: string
  attachments: ExpertBookingAttachment[]
}

export const expertBookingSlotSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  startTime: z.string().regex(/^\d{2}:\d{2}$/),
  endTime: z.string().regex(/^\d{2}:\d{2}$/)
}).superRefine((slot, ctx) => {
  if (slot.startTime >= slot.endTime) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'end_before_start',
      path: ['endTime']
    })
  }
})

export const expertBookingFormSchema = z.object({
  contactName: z.string().trim().min(1).max(80),
  phone: z.string().trim().min(8).max(20),
  email: z.string().trim().email().max(120),
  lineId: z.string().trim().max(64).optional().or(z.literal('')),
  slots: z.array(expertBookingSlotSchema).min(1).max(3),
  /** OpenAPI：requirement_note 選填 */
  requirements: z.string().trim().max(2000).optional().or(z.literal('')),
  attachments: z.array(z.object({
    key: z.string().min(1),
    filename: z.string().min(1),
    content_type: z.enum([
      'application/pdf',
      'image/jpeg',
      'image/png',
      'image/webp'
    ]),
    size_bytes: z.number().int().min(1)
  })).max(5).optional()
})

export type ExpertBookingFormInput = z.infer<typeof expertBookingFormSchema>

export function emptyExpertBookingSlot(): ExpertBookingDraftSlot {
  return { date: '', startTime: '10:00', endTime: '12:00' }
}

export function emptyExpertBookingDraft(email = ''): ExpertBookingDraft {
  return {
    contactName: '',
    phone: '',
    email,
    lineId: '',
    slots: [emptyExpertBookingSlot()],
    requirements: '',
    attachments: []
  }
}

/** 表單時段 → OpenAPI preferred_slots 字串（自由文字；1～3）。 */
export function slotDraftToPreferredLabel(
  slot: ExpertBookingDraftSlot,
  locale = 'zh-TW'
): string {
  const startIso = `${slot.date}T${slot.startTime}:00+08:00`
  const endIso = `${slot.date}T${slot.endTime}:00+08:00`
  return formatSlotRangeLabel(startIso, endIso, locale)
}

export function draftToExpertBookingPayload(
  draft: ExpertBookingDraft,
  locale = 'zh-TW'
): ExpertBookingOrderPayload {
  const preferred_slots = draft.slots.map(slot => slotDraftToPreferredLabel(slot, locale))
  return {
    contact_name: draft.contactName.trim(),
    contact_phone: draft.phone.trim(),
    contact_email: draft.email.trim(),
    contact_line: draft.lineId.trim() || null,
    preferred_slots,
    requirement_note: draft.requirements.trim() || null,
    attachments: draft.attachments.length ? draft.attachments : undefined
  }
}

/** 組裝 POST /orders（kind=expert_booking + expert_booking_code + expert_booking）。 */
export function draftToOrderCreateRequest(
  draft: ExpertBookingDraft,
  opts: {
    paymentMethod?: CandorPaymentMethod
    invoiceType?: CandorInvoiceType
    /** member 發票 = 會員 email（OpenAPI 必填 invoice_carrier）。 */
    invoiceCarrier: string
    locale?: string
  }
): OrderCreateRequest {
  const payload = draftToExpertBookingPayload(draft, opts.locale ?? 'zh-TW')
  return {
    lines: [{
      kind: 'expert_booking',
      expert_booking_code: EXPERT_BOOKING_PRODUCT_CODE
    }],
    payment_method: opts.paymentMethod ?? 'card',
    invoice_type: opts.invoiceType ?? 'member',
    invoice_carrier: opts.invoiceCarrier,
    recipient: {
      name: payload.contact_name,
      phone: payload.contact_phone,
      address: null,
      email: payload.contact_email
    },
    expert_booking: payload
  }
}

const SERVICE_STATUS_I18N: Record<ExpertBookingServiceStatus, string> = {
  awaiting_schedule: 'expertBooking.status.awaiting_schedule',
  scheduled: 'expertBooking.status.scheduled',
  completed: 'expertBooking.status.completed',
  cancelled: 'expertBooking.status.cancelled'
}

export function expertBookingStatusI18nKey(
  status: string | null | undefined
): string {
  if (status && status in SERVICE_STATUS_I18N) {
    return SERVICE_STATUS_I18N[status as ExpertBookingServiceStatus]
  }
  return 'expertBooking.status.unknown'
}

export function expertBookingStatusTone(
  status: string | null | undefined
): 'pending' | 'info' | 'success' | 'muted' {
  switch (status) {
    case 'awaiting_schedule':
      return 'pending'
    case 'scheduled':
      return 'info'
    case 'completed':
      return 'success'
    case 'cancelled':
      return 'muted'
    default:
      return 'muted'
  }
}

export function isExpertBookingOrder(detail: {
  lines?: Array<Record<string, unknown>> | null
  expert_booking?: ExpertBookingOnOrder | null
} | null | undefined): boolean {
  if (!detail) {
    return false
  }
  if (detail.expert_booking?.id) {
    return true
  }
  const lines = detail.lines
  if (!Array.isArray(lines)) {
    return false
  }
  return lines.some(line => line && typeof line === 'object' && line.kind === 'expert_booking')
}

export function formatSlotRangeLabel(
  startAt: string,
  endAt: string,
  locale = 'zh-TW'
): string {
  const start = new Date(startAt)
  const end = new Date(endAt)
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return `${startAt}–${endAt}`
  }
  const dateFmt = new Intl.DateTimeFormat(locale, {
    month: 'numeric',
    day: 'numeric',
    weekday: 'short',
    timeZone: 'Asia/Taipei'
  })
  const timeFmt = new Intl.DateTimeFormat(locale, {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: 'Asia/Taipei'
  })
  return `${dateFmt.format(start)} ${timeFmt.format(start)}–${timeFmt.format(end)}`
}

export function formatConfirmedAtLabel(
  startsAt: string | null | undefined,
  endsAt: string | null | undefined = null,
  locale = 'zh-TW'
): string | null {
  if (!startsAt) {
    return null
  }
  const start = new Date(startsAt)
  if (Number.isNaN(start.getTime())) {
    return startsAt
  }
  if (endsAt) {
    return formatSlotRangeLabel(startsAt, endsAt, locale)
  }
  return new Intl.DateTimeFormat(locale, {
    month: 'numeric',
    day: 'numeric',
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: 'Asia/Taipei'
  }).format(start)
}

function asAttachment(raw: unknown): ExpertBookingAttachment | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return null
  }
  const row = raw as Record<string, unknown>
  const key = typeof row.key === 'string' ? row.key : ''
  const filename = typeof row.filename === 'string' ? row.filename : ''
  const content_type = row.content_type
  const size_bytes = typeof row.size_bytes === 'number' ? row.size_bytes : 0
  if (!key || !filename || size_bytes < 1) {
    return null
  }
  if (
    content_type !== 'application/pdf'
    && content_type !== 'image/jpeg'
    && content_type !== 'image/png'
    && content_type !== 'image/webp'
  ) {
    return null
  }
  return { key, filename, content_type, size_bytes }
}

export function parseExpertBookingOnOrder(raw: unknown): ExpertBookingOnOrder | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return null
  }
  const row = raw as Record<string, unknown>
  const id = typeof row.id === 'string' ? row.id : ''
  if (!id) {
    return null
  }
  const statusRaw = typeof row.status === 'string' ? row.status : 'awaiting_schedule'
  const status: ExpertBookingServiceStatus
    = statusRaw === 'scheduled'
      || statusRaw === 'completed'
      || statusRaw === 'cancelled'
      || statusRaw === 'awaiting_schedule'
      ? statusRaw
      : 'awaiting_schedule'

  const slotsRaw = Array.isArray(row.preferred_slots) ? row.preferred_slots : []
  const preferred_slots = slotsRaw
    .filter((item): item is string => typeof item === 'string' && item.trim() !== '')

  const attachmentsRaw = Array.isArray(row.attachments) ? row.attachments : []
  const attachments: ExpertBookingAttachment[] = []
  for (const item of attachmentsRaw) {
    const parsed = asAttachment(item)
    if (parsed) {
      attachments.push(parsed)
    }
  }

  const picksRaw = Array.isArray(row.product_picks) ? row.product_picks : []
  const product_picks: ExpertBookingProductPick[] = []
  for (const item of picksRaw) {
    if (!item || typeof item !== 'object') {
      continue
    }
    const r = item as Record<string, unknown>
    const pickId = typeof r.id === 'string' ? r.id : ''
    const sellable_item_id = typeof r.sellable_item_id === 'string'
      ? r.sellable_item_id
      : ''
    const reason = typeof r.reason === 'string' ? r.reason : ''
    const sort_order = typeof r.sort_order === 'number' ? r.sort_order : product_picks.length
    if (!pickId || !sellable_item_id) {
      continue
    }
    product_picks.push({
      id: pickId,
      sellable_item_id,
      sellable_item_code: typeof r.sellable_item_code === 'string'
        ? r.sellable_item_code
        : null,
      sellable_item_name: typeof r.sellable_item_name === 'string'
        ? r.sellable_item_name
        : null,
      reason,
      sort_order
    })
  }
  product_picks.sort((a, b) => a.sort_order - b.sort_order)

  return {
    id,
    status,
    contact_name: typeof row.contact_name === 'string' ? row.contact_name : undefined,
    contact_phone: typeof row.contact_phone === 'string' ? row.contact_phone : undefined,
    contact_email: typeof row.contact_email === 'string' ? row.contact_email : undefined,
    contact_line: typeof row.contact_line === 'string' ? row.contact_line : null,
    preferred_slots,
    requirement_note: typeof row.requirement_note === 'string' ? row.requirement_note : null,
    attachments,
    confirmed_starts_at: typeof row.confirmed_starts_at === 'string'
      ? row.confirmed_starts_at
      : null,
    confirmed_ends_at: typeof row.confirmed_ends_at === 'string'
      ? row.confirmed_ends_at
      : null,
    product_picks,
    created_at: typeof row.created_at === 'string' ? row.created_at : null,
    updated_at: typeof row.updated_at === 'string' ? row.updated_at : null
  }
}
