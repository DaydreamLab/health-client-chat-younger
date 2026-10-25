import type { OrderRecord } from './first-order'

/** Wearables-style `?demo=` switch for orders list empty vs sample filled. */
export const ORDERS_DEMO_QUERY = 'demo'

export type OrdersDemoMode = 'sample' | 'empty'

export function parseOrdersDemoMode(raw: string | null | undefined): OrdersDemoMode {
  if (raw === 'empty') {
    return 'empty'
  }
  // Default sample when API is empty (金流 E2E paused); `?demo=empty` forces real empty.
  return 'sample'
}

const recipient = {
  name: '張小明',
  phone: '0912345678',
  address: '台北市信義區信義路五段7號',
  email: 'demo@example.com'
}

const packageItem = {
  code: 'immunity_30d',
  name: '免疫力配方 30日',
  dailyDose: 1,
  monthlyCost: 1280,
  isCore: true,
  imageUrl: null as string | null
}

/**
 * Beta sample orders matching Irice list/detail mocks (paid / shipping / completed).
 * Stable ids so list → detail deep-links work without core.
 */
export const DEMO_ORDERS: OrderRecord[] = [
  {
    id: 'demo-order-paid',
    number: 'ORD-20261020-001',
    createdAt: '2026-10-20T15:13:00+08:00',
    packagePlanCode: 'basic',
    packageName: '保健品月付方案',
    amount: 1280,
    productCodes: [packageItem.code],
    productNames: [packageItem.name],
    items: [{ ...packageItem }],
    paymentMethod: 'card',
    paymentStatus: 'paid',
    orderStatus: 'confirmed',
    delivery: 'home',
    recipient: { ...recipient },
    invoice: 'member',
    invoiceStatus: 'issued',
    invoiceNumber: null,
    invoiceCarrierLabel: '載具',
    trackingNumber: null,
    trackingUrl: null,
    quantity: 1,
    messages: [],
    timeline: [
      { id: 'confirmed', at: '2026-10-20T15:13:00+08:00' },
      { id: 'picking', at: null },
      { id: 'shipped', at: null },
      { id: 'delivered', at: null }
    ]
  },
  {
    id: 'demo-order-shipping',
    number: 'ORD-20261018-002',
    createdAt: '2026-10-18T11:00:00+08:00',
    packagePlanCode: 'basic',
    packageName: '保健品月付方案',
    amount: 1280,
    productCodes: [packageItem.code],
    productNames: [packageItem.name],
    items: [{ ...packageItem }],
    paymentMethod: 'card',
    paymentStatus: 'paid',
    orderStatus: 'shipped',
    delivery: 'home',
    recipient: { ...recipient },
    invoice: 'member',
    invoiceStatus: 'issued',
    invoiceNumber: null,
    invoiceCarrierLabel: '載具',
    trackingNumber: '12434567890',
    trackingUrl: 'https://www.t-cat.com.tw/Inquire/TraceDetail.aspx?BillID=12434567890',
    quantity: 1,
    messages: [],
    timeline: [
      { id: 'confirmed', at: '2026-10-18T11:00:00+08:00' },
      { id: 'picking', at: '2026-10-19T09:00:00+08:00' },
      { id: 'shipped', at: '2026-10-20T10:00:00+08:00' },
      { id: 'delivered', at: null }
    ]
  },
  {
    id: 'demo-order-completed',
    number: 'ORD-20261010-003',
    createdAt: '2026-10-10T09:30:00+08:00',
    packagePlanCode: 'basic',
    packageName: '保健品月付方案',
    amount: 1280,
    productCodes: [packageItem.code],
    productNames: [packageItem.name],
    items: [{ ...packageItem }],
    paymentMethod: 'card',
    paymentStatus: 'paid',
    orderStatus: 'delivered',
    delivery: 'home',
    recipient: { ...recipient },
    invoice: 'member',
    invoiceStatus: 'issued',
    invoiceNumber: null,
    invoiceCarrierLabel: '載具',
    trackingNumber: '98765432109',
    trackingUrl: 'https://www.t-cat.com.tw/Inquire/TraceDetail.aspx?BillID=98765432109',
    quantity: 1,
    messages: [],
    timeline: [
      { id: 'confirmed', at: '2026-10-10T09:30:00+08:00' },
      { id: 'picking', at: '2026-10-11T09:00:00+08:00' },
      { id: 'shipped', at: '2026-10-12T10:00:00+08:00' },
      { id: 'delivered', at: '2026-10-14T16:00:00+08:00' }
    ]
  }
]

export function listDemoOrders(): OrderRecord[] {
  return DEMO_ORDERS.map(order => ({
    ...order,
    recipient: { ...order.recipient },
    items: order.items.map(item => ({ ...item })),
    timeline: order.timeline.map(step => ({ ...step })),
    messages: []
  }))
}

export function getDemoOrder(id: string): OrderRecord | null {
  const found = DEMO_ORDERS.find(order => order.id === id)
  if (!found) {
    return null
  }
  return {
    ...found,
    recipient: { ...found.recipient },
    items: found.items.map(item => ({ ...item })),
    timeline: found.timeline.map(step => ({ ...step })),
    messages: []
  }
}

export function isDemoOrderId(id: string): boolean {
  return DEMO_ORDERS.some(order => order.id === id)
}
