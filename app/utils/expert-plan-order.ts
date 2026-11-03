import type { OrderDetail, RefundRequestStatus } from './candor-api'

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

/** Expert case status on order (spec 33 assumption; may arrive nested). */
export type ExpertCasePhase = 'awaiting_review' | 'reviewed' | 'none'

export function orderExpertCasePhase(detail: Pick<OrderDetail, 'expert_case_status' | 'expert_case_review'> | null | undefined): ExpertCasePhase {
  const raw = detail?.expert_case_status
    ?? detail?.expert_case_review?.status
    ?? null
  if (raw === 'reviewed' || raw === 'awaiting_review') {
    return raw
  }
  return 'none'
}

export type RefundBlockReason = 'before_reviewed' | 'picking' | 'shipped'

export interface RefundRequestUi {
  /** Expert-plan paid order that may show refund UI at all. */
  applicable: boolean
  /** Show「申請退款」button (enabled or disabled). Hidden after requested／rejected／refunded. */
  showButton: boolean
  enabled: boolean
  blockReason: RefundBlockReason | null
}

/**
 * v4／主卡：定稿後、開始理貨前才可申請；不能退時按鈕灰掉＋原因（不隱藏）。
 * `picking` 起不可退（C15）。`can_request_refund === false` 仍可信，但需搭配本地 reason。
 */
export function refundRequestUi(input: {
  canRequestRefund?: boolean | null
  refundRequestStatus?: RefundRequestStatus | null
  paymentStatus?: string | null
  hasExpertPlanLine?: boolean
  shipmentStatus?: string | null
  expertCasePhase?: ExpertCasePhase | null
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
  const status = input.refundRequestStatus
  if (status === 'requested' || status === 'rejected' || status === 'refunded') {
    return {
      applicable: true,
      showButton: false,
      enabled: false,
      blockReason: null
    }
  }

  const phase = input.expertCasePhase ?? 'none'
  const shipment = (input.shipmentStatus ?? '').trim()
  const isPicking = shipment === 'picking'
  const isShipped = shipment !== '' && shipment !== 'picking' && shipment !== 'pending'

  let blockReason: RefundBlockReason | null = null
  if (phase !== 'reviewed') {
    blockReason = 'before_reviewed'
  } else if (isPicking) {
    blockReason = 'picking'
  } else if (isShipped) {
    blockReason = 'shipped'
  }

  if (input.canRequestRefund === true && !blockReason) {
    return {
      applicable: true,
      showButton: true,
      enabled: true,
      blockReason: null
    }
  }
  if (input.canRequestRefund === false && !blockReason) {
    // Core denied without a local gate — treat as before_reviewed fallback.
    blockReason = 'before_reviewed'
  }

  const enabled = blockReason == null && input.canRequestRefund !== false
  return {
    applicable: true,
    showButton: true,
    enabled,
    blockReason
  }
}

/** @deprecated Prefer refundRequestUi — kept for transitional callers. */
export function canShowRefundRequest(input: {
  canRequestRefund?: boolean | null
  refundRequestStatus?: RefundRequestStatus | null
  paymentStatus?: string | null
  hasExpertPlanLine?: boolean
  shipmentStatus?: string | null
  expertCasePhase?: ExpertCasePhase | null
}): boolean {
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
  expertCasePhase?: ExpertCasePhase | null
}): boolean {
  if (!input.hasExpertPlanLine) {
    return false
  }
  if (input.paymentStatus !== 'paid') {
    return false
  }
  return (input.expertCasePhase ?? 'none') === 'awaiting_review'
}
