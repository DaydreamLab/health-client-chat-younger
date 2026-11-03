import type {
  OrderDetail,
  RefundBlockedReason,
  RefundRequestStatus
} from './candor-api'

/** True when order lines include an expert_plan kind. */
export function orderHasExpertPlanLine(detail: Pick<OrderDetail, 'lines'> | null | undefined): boolean {
  const lines = detail?.lines
  if (!Array.isArray(lines)) {
    return false
  }
  return lines.some(line => line && typeof line === 'object' && line.kind === 'expert_plan')
}

export function orderShipmentStatus(
  detail: Pick<OrderDetail, 'shipment_status' | 'shipment'> | null | undefined
): string | null {
  if (!detail) {
    return null
  }
  if (typeof detail.shipment_status === 'string' && detail.shipment_status.trim()) {
    return detail.shipment_status.trim()
  }
  const nested = detail.shipment?.status
  if (typeof nested === 'string' && nested.trim()) {
    return nested.trim()
  }
  return null
}

export type OrderExpertCaseStatus = 'awaiting_review' | 'reviewed' | null

export type ExpertCaseLifecyclePhase = 'processing' | 'finalized' | null

export function orderExpertCaseStatus(
  detail: Pick<OrderDetail, 'expert_case_status' | 'expert_case_review'> | null | undefined
): OrderExpertCaseStatus {
  const raw = detail?.expert_case_status
    ?? detail?.expert_case_review?.status
    ?? null
  if (raw === 'reviewed' || raw === 'awaiting_review') {
    return raw
  }
  return null
}

export function orderExpertCasePhase(
  detail: Pick<OrderDetail, 'expert_case_phase'> | null | undefined
): ExpertCaseLifecyclePhase {
  const raw = detail?.expert_case_phase ?? null
  if (raw === 'processing' || raw === 'finalized') {
    return raw
  }
  return null
}

export function orderRefundStatus(
  detail: Pick<OrderDetail, 'refund_status' | 'refund_request_status'> | null | undefined
): RefundRequestStatus | null {
  if (!detail) {
    return null
  }
  return detail.refund_status ?? detail.refund_request_status ?? null
}

export interface RefundRequestUi {
  /** Expert-plan paid order that may show refund UI at all. */
  applicable: boolean
  /** Show「申請退款」button (enabled or disabled). Hidden after requested／rejected／refunded. */
  showButton: boolean
  enabled: boolean
  blockReason: RefundBlockedReason | null
}

const HIDE_REFUND_BUTTON: ReadonlySet<RefundBlockedReason> = new Set([
  'refund_request_exists',
  'refund_rejected'
])

/**
 * v4／主卡：定稿後、開始理貨前才可申請；core `refund_blocked_reason` 為準。
 */
export function refundRequestUi(input: {
  refundBlockedReason?: RefundBlockedReason | null
  refundStatus?: RefundRequestStatus | null
  refundRequestStatus?: RefundRequestStatus | null
  paymentStatus?: string | null
  hasExpertPlanLine?: boolean
}): RefundRequestUi {
  const none: RefundRequestUi = {
    applicable: false,
    showButton: false,
    enabled: false,
    blockReason: null
  }
  if (!input.hasExpertPlanLine) {
    return none
  }
  if (input.paymentStatus !== 'paid' && input.paymentStatus !== 'refunded') {
    return none
  }

  const status = input.refundStatus ?? input.refundRequestStatus ?? null
  if (status === 'requested' || status === 'rejected' || status === 'refunded') {
    return {
      applicable: true,
      showButton: false,
      enabled: false,
      blockReason: null
    }
  }

  const blocked = input.refundBlockedReason ?? null
  if (blocked && HIDE_REFUND_BUTTON.has(blocked)) {
    return {
      applicable: true,
      showButton: false,
      enabled: false,
      blockReason: blocked
    }
  }

  if (blocked) {
    return {
      applicable: true,
      showButton: true,
      enabled: false,
      blockReason: blocked
    }
  }

  return {
    applicable: true,
    showButton: true,
    enabled: true,
    blockReason: null
  }
}

/** @deprecated Prefer refundRequestUi — kept for transitional callers. */
export function canShowRefundRequest(input: Parameters<typeof refundRequestUi>[0]): boolean {
  return refundRequestUi(input).enabled
}

/** Prefer core `refund_request_display` (「退款申請中」); never invent other copy. */
export function refundRequestDisplayText(input: {
  status?: RefundRequestStatus | null
  display?: string | null
}): string | null {
  if (input.status === 'requested') {
    const fromCore = input.display?.trim()
    return fromCore || '退款申請中'
  }
  return null
}

/** True when paid expert_plan order is waiting for expert finalize. */
export function isExpertProcessing(input: {
  hasExpertPlanLine?: boolean
  paymentStatus?: string | null
  expertCasePhase?: ExpertCaseLifecyclePhase | null
  expertCaseStatus?: OrderExpertCaseStatus | null
}): boolean {
  if (!input.hasExpertPlanLine) {
    return false
  }
  if (input.paymentStatus !== 'paid') {
    return false
  }
  if (input.expertCasePhase === 'processing') {
    return true
  }
  return input.expertCaseStatus === 'awaiting_review'
}
