import { canRepayOrder } from './order-actions'

/** core #146 preview `existing_order` (unpaid／pending／failed／expired reuse). */
export interface CheckoutExistingOrder {
  orderId: string | null
  orderNo: string | null
  expertPlanCode: string | null
  paymentStatus: string | null
}

function readString(row: Record<string, unknown>, key: string): string | null {
  const raw = row[key]
  if (typeof raw !== 'string') {
    return null
  }
  const trimmed = raw.trim()
  return trimmed ? trimmed : null
}

/**
 * Parse preview.existing_order loosely (extra fields OK; missing → null).
 * Returns null when the value is absent or not an object.
 */
export function parseCheckoutExistingOrder(raw: unknown): CheckoutExistingOrder | null {
  if (!raw || typeof raw !== 'object') {
    return null
  }
  const row = raw as Record<string, unknown>
  return {
    orderId: readString(row, 'order_id'),
    orderNo: readString(row, 'order_no'),
    expertPlanCode: readString(row, 'expert_plan_code'),
    paymentStatus: readString(row, 'payment_status')
  }
}

/**
 * True when existing_order should send the guest to order repay
 * (has order_id and payment is repayable; paid／cancelled／refunded → false).
 */
export function shouldRedirectExistingOrderToRepay(data: CheckoutExistingOrder): boolean {
  if (!data.orderId) {
    return false
  }
  return canRepayOrder({
    orderStatus: 'created',
    paymentStatus: data.paymentStatus || 'pending'
  })
}
