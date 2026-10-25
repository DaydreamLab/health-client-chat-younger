import { describe, expect, it } from 'vitest'
import {
  formatOrderDate,
  orderDisplayStatus,
  orderProductSummary
} from '../../app/utils/order-display'
import { getDemoOrder, listDemoOrders, parseOrdersDemoMode } from '../../app/utils/orders-mock'
import type { OrderRecord } from '../../app/utils/first-order'

function baseOrder(overrides: Partial<OrderRecord> = {}): OrderRecord {
  return {
    id: 'o1',
    number: 'ORD-1',
    createdAt: '2026-10-20T15:13:00+08:00',
    packagePlanCode: 'basic',
    packageName: '保健品月付方案',
    amount: 1280,
    productCodes: [],
    items: [],
    paymentMethod: 'card',
    paymentStatus: 'paid',
    orderStatus: 'confirmed',
    delivery: 'home',
    recipient: { name: '', phone: '', address: '', email: '' },
    invoice: 'member',
    quantity: 1,
    messages: [],
    timeline: [
      { id: 'confirmed', at: '2026-10-20T15:13:00+08:00' },
      { id: 'picking', at: null },
      { id: 'shipped', at: null },
      { id: 'delivered', at: null }
    ],
    ...overrides
  }
}

describe('order-display', () => {
  it('maps paid / shipping / completed for list pills', () => {
    expect(orderDisplayStatus(baseOrder())).toBe('paid')
    expect(orderDisplayStatus(baseOrder({
      orderStatus: 'shipped',
      timeline: [
        { id: 'confirmed', at: 'a' },
        { id: 'picking', at: 'b' },
        { id: 'shipped', at: 'c' },
        { id: 'delivered', at: null }
      ]
    }))).toBe('shipping')
    expect(orderDisplayStatus(baseOrder({
      orderStatus: 'delivered',
      timeline: [
        { id: 'confirmed', at: 'a' },
        { id: 'picking', at: 'b' },
        { id: 'shipped', at: 'c' },
        { id: 'delivered', at: 'd' }
      ]
    }))).toBe('completed')
    expect(orderDisplayStatus(baseOrder({ paymentStatus: 'unpaid' }))).toBe('awaitingPayment')
  })

  it('formats date and product summary for list cards', () => {
    expect(formatOrderDate('2026-10-20T15:13:00+08:00')).toBe('2026/10/20')
    expect(orderProductSummary(baseOrder())).toBe('保健品月付方案 x1')
  })
})

describe('orders-mock', () => {
  it('defaults to sample demo mode and exposes three statuses', () => {
    expect(parseOrdersDemoMode(undefined)).toBe('sample')
    expect(parseOrdersDemoMode('empty')).toBe('empty')
    const list = listDemoOrders()
    expect(list).toHaveLength(3)
    expect(orderDisplayStatus(list[0]!)).toBe('paid')
    expect(orderDisplayStatus(list[1]!)).toBe('shipping')
    expect(orderDisplayStatus(list[2]!)).toBe('completed')
    expect(getDemoOrder('demo-order-shipping')?.trackingNumber).toBe('12434567890')
  })
})
