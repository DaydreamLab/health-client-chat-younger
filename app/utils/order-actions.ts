/** Visibility helpers for order repay / cancel (spec 27 + core #146 pending repay). */

const REPAYABLE_PAYMENT = new Set(['unpaid', 'pending', 'failed', 'expired'])

export function canRepayOrder(order: {
  orderStatus?: string | null
  paymentStatus?: string | null
}): boolean {
  const status = order.orderStatus || ''
  if (status === 'cancelled' || status === 'refunded') {
    return false
  }
  const payment = order.paymentStatus || 'unpaid'
  return REPAYABLE_PAYMENT.has(payment)
}

export function canCancelOrder(order: {
  orderStatus?: string | null
  paymentStatus?: string | null
}): boolean {
  if (order.orderStatus !== 'created') {
    return false
  }
  return order.paymentStatus !== 'paid'
}
