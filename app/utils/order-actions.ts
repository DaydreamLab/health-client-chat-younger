/** Visibility helpers for order repay / cancel (spec 27). */

export function canRepayOrder(order: {
  orderStatus?: string | null
  paymentStatus?: string | null
}): boolean {
  if (order.orderStatus === 'cancelled') {
    return false
  }
  const payment = order.paymentStatus || 'unpaid'
  return payment === 'unpaid' || payment === 'failed' || payment === 'expired'
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
