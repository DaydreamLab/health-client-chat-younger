import { timelineStatus, type OrderRecord } from './first-order'

/** List/detail status pills aligned with Irice mocks. */
export type OrderDisplayStatus
  = 'awaitingPayment'
    | 'paid'
    | 'shipping'
    | 'completed'
    | 'cancelled'

export function orderDisplayStatus(order: OrderRecord): OrderDisplayStatus {
  if (order.orderStatus === 'cancelled') {
    return 'cancelled'
  }

  if (order.paymentStatus && order.paymentStatus !== 'paid' && order.paymentStatus !== 'refunded') {
    return 'awaitingPayment'
  }

  const step = timelineStatus(order.timeline)
  if (order.orderStatus === 'delivered' || step === 'delivered') {
    return 'completed'
  }
  if (
    order.orderStatus === 'shipped'
    || step === 'shipped'
    || step === 'picking'
  ) {
    return 'shipping'
  }

  return 'paid'
}

export function orderDisplayStatusClass(status: OrderDisplayStatus): string {
  switch (status) {
    case 'paid':
      return 'bg-primary/15 text-primary'
    case 'shipping':
      return 'bg-amber-500/15 text-amber-700 dark:text-amber-300'
    case 'completed':
      return 'bg-muted text-muted'
    case 'awaitingPayment':
      return 'bg-primary/10 text-primary'
    case 'cancelled':
      return 'bg-muted text-muted'
    default:
      return 'bg-muted text-muted'
  }
}

export function formatOrderDate(value: string): string {
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (match) {
    return `${match[1]}/${match[2]}/${match[3]}`
  }
  return value.replace('T', ' ').slice(0, 10).replace(/-/g, '/')
}

export function orderProductSummary(order: OrderRecord): string {
  const name = order.packageName || order.packagePlanCode || ''
  const qty = order.quantity ?? 1
  if (!name) {
    return ''
  }
  return `${name} x${qty}`
}
