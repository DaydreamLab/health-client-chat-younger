/**
 * 預約專家（expert_booking）— FE 型別、表單 schema、顯示輔助。
 * API 契約尚未合併；路徑／欄位依規格推定，見 useExpertBookingApi。
 */

import { z } from 'zod'

/** 獨立商品 NT$6,000（含稅整數元）。 */
export const EXPERT_BOOKING_PRICE_TWD = 6000

export const EXPERT_BOOKING_PRODUCT_CODE = 'expert_booking'

/** 服務狀態（與付款狀態分開）。 */
export type ExpertBookingServiceStatus
  = 'pending_schedule'
    | 'scheduled'
    | 'completed'
    | 'cancelled'

export interface ExpertBookingPreferredSlot {
  /** ISO-8601 datetime */
  start_at: string
  /** ISO-8601 datetime */
  end_at: string
}

export interface ExpertBookingProductRecommendation {
  sellable_item_id: string
  sellable_item_code?: string | null
  sellable_item_name: string
  reason: string
}

/** GET /order/{id} 附加區塊（假設欄位）。 */
export interface ExpertBookingOnOrder {
  id: string
  status: ExpertBookingServiceStatus
  confirmed_at?: string | null
  preferred_slots: ExpertBookingPreferredSlot[]
  requirements: string
  contact_name?: string | null
  phone?: string | null
  email?: string | null
  line_id?: string | null
  product_recommendations?: ExpertBookingProductRecommendation[] | null
}

export interface ExpertBookingProduct {
  code: string
  name: string
  price: number
  currency: 'TWD'
}

/** POST /expert-bookings/attachments 回應（假設）。 */
export interface ExpertBookingAttachmentAck {
  id: string
}

/** POST /expert-bookings 請求體（假設）。 */
export interface ExpertBookingCreateRequest {
  contact_name: string
  phone: string
  email: string
  line_id?: string | null
  preferred_slots: ExpertBookingPreferredSlot[]
  requirements: string
  attachment_ids?: string[]
  payment_method: 'card' | 'linepay' | 'atm'
  invoice_type: 'member' | 'cloud' | 'company' | 'donate'
  invoice_carrier?: string
  conversation_id?: string | null
}

/** 表單草稿（confirm 頁共用）。 */
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
  /** Local file names only — upload ids filled on submit when API ready. */
  attachmentNames: string[]
  attachmentIds: string[]
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
  requirements: z.string().trim().min(1).max(2000),
  attachmentNames: z.array(z.string()).max(5).optional(),
  attachmentIds: z.array(z.string()).max(5).optional()
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
    attachmentNames: [],
    attachmentIds: []
  }
}

/** Local date+time → ISO assumed Asia/Taipei (+08:00). */
export function slotDraftToIso(slot: ExpertBookingDraftSlot): ExpertBookingPreferredSlot {
  return {
    start_at: `${slot.date}T${slot.startTime}:00+08:00`,
    end_at: `${slot.date}T${slot.endTime}:00+08:00`
  }
}

export function draftToCreateBody(
  draft: ExpertBookingDraft,
  opts: {
    paymentMethod?: ExpertBookingCreateRequest['payment_method']
    invoiceType?: ExpertBookingCreateRequest['invoice_type']
    invoiceCarrier?: string
    conversationId?: string | null
  } = {}
): ExpertBookingCreateRequest {
  return {
    contact_name: draft.contactName.trim(),
    phone: draft.phone.trim(),
    email: draft.email.trim(),
    line_id: draft.lineId.trim() || null,
    preferred_slots: draft.slots.map(slotDraftToIso),
    requirements: draft.requirements.trim(),
    attachment_ids: draft.attachmentIds.length ? draft.attachmentIds : undefined,
    payment_method: opts.paymentMethod ?? 'card',
    invoice_type: opts.invoiceType ?? 'member',
    invoice_carrier: opts.invoiceCarrier,
    conversation_id: opts.conversationId ?? null
  }
}

const SERVICE_STATUS_I18N: Record<ExpertBookingServiceStatus, string> = {
  pending_schedule: 'expertBooking.status.pending_schedule',
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

/** Badge tone for service status pills. */
export function expertBookingStatusTone(
  status: string | null | undefined
): 'pending' | 'info' | 'success' | 'muted' {
  switch (status) {
    case 'pending_schedule':
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
  iso: string | null | undefined,
  locale = 'zh-TW'
): string | null {
  if (!iso) {
    return null
  }
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) {
    return iso
  }
  return new Intl.DateTimeFormat(locale, {
    month: 'numeric',
    day: 'numeric',
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: 'Asia/Taipei'
  }).format(d)
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
  const statusRaw = typeof row.status === 'string' ? row.status : 'pending_schedule'
  const status: ExpertBookingServiceStatus
    = statusRaw === 'scheduled'
      || statusRaw === 'completed'
      || statusRaw === 'cancelled'
      || statusRaw === 'pending_schedule'
      ? statusRaw
      : 'pending_schedule'

  const slotsRaw = Array.isArray(row.preferred_slots) ? row.preferred_slots : []
  const preferred_slots: ExpertBookingPreferredSlot[] = []
  for (const item of slotsRaw) {
    if (!item || typeof item !== 'object') {
      continue
    }
    const s = item as Record<string, unknown>
    const start_at = typeof s.start_at === 'string' ? s.start_at : ''
    const end_at = typeof s.end_at === 'string' ? s.end_at : ''
    if (start_at && end_at) {
      preferred_slots.push({ start_at, end_at })
    }
  }

  const recsRaw = Array.isArray(row.product_recommendations)
    ? row.product_recommendations
    : []
  const product_recommendations: ExpertBookingProductRecommendation[] = []
  for (const item of recsRaw) {
    if (!item || typeof item !== 'object') {
      continue
    }
    const r = item as Record<string, unknown>
    const sellable_item_id = typeof r.sellable_item_id === 'string'
      ? r.sellable_item_id
      : ''
    const sellable_item_name = typeof r.sellable_item_name === 'string'
      ? r.sellable_item_name
      : ''
    const reason = typeof r.reason === 'string' ? r.reason : ''
    if (!sellable_item_id || !sellable_item_name) {
      continue
    }
    product_recommendations.push({
      sellable_item_id,
      sellable_item_code: typeof r.sellable_item_code === 'string'
        ? r.sellable_item_code
        : null,
      sellable_item_name,
      reason
    })
  }

  return {
    id,
    status,
    confirmed_at: typeof row.confirmed_at === 'string' ? row.confirmed_at : null,
    preferred_slots,
    requirements: typeof row.requirements === 'string' ? row.requirements : '',
    contact_name: typeof row.contact_name === 'string' ? row.contact_name : null,
    phone: typeof row.phone === 'string' ? row.phone : null,
    email: typeof row.email === 'string' ? row.email : null,
    line_id: typeof row.line_id === 'string' ? row.line_id : null,
    product_recommendations
  }
}
