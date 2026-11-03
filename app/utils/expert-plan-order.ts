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

/**
 * Show「申請退款」when core says so, or when local gates match spec 33:
 * expert_plan line + paid + no prior refund_request + shipment null|picking.
 * Rejected → never again. `can_request_refund === false` wins when present.
 */
export function canShowRefundRequest(input: {
  canRequestRefund?: boolean | null
  refundRequestStatus?: RefundRequestStatus | null
  paymentStatus?: string | null
  hasExpertPlanLine?: boolean
  shipmentStatus?: string | null
}): boolean {
  if (input.canRequestRefund === false) {
    return false
  }
  if (input.refundRequestStatus === 'rejected'
    || input.refundRequestStatus === 'requested'
    || input.refundRequestStatus === 'refunded') {
    return false
  }
  if (input.canRequestRefund === true) {
    return true
  }
  if (!input.hasExpertPlanLine) {
    return false
  }
  if (input.paymentStatus !== 'paid') {
    return false
  }
  const shipment = input.shipmentStatus
  if (shipment != null && shipment !== '' && shipment !== 'picking') {
    return false
  }
  return input.refundRequestStatus == null
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
