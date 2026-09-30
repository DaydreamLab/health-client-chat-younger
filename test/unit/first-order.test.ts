import { describe, expect, it } from 'vitest'
import { checkoutSchema, createOrderSchema } from '../../app/utils/checkout-schema'
import {
  buildDemoOrder,
  demoPackagePlans,
  formatTwd,
  itemsForPackagePlan,
  shipmentStepIds,
  shouldPersistChat,
  snapshotChatMessage,
  timelineStatus
} from '../../app/utils/first-order'

const recipient = {
  name: '林晏婷',
  phone: '0912345678',
  address: '台北市',
  email: 'guest@example.com'
}

describe('first-order demo', () => {
  it('prices one-month basic below advance', () => {
    expect(demoPackagePlans.basic.price).toBe(1280)
    expect(demoPackagePlans.advance.price).toBe(1980)
    expect(demoPackagePlans.basic.durationMonths).toBe(1)
    expect(demoPackagePlans.advance.durationMonths).toBe(1)
    expect(formatTwd(1280)).toBe('NT$1,280')
  })

  it('does not let advance drop core items', () => {
    const coreIds = itemsForPackagePlan('basic').map(item => item.id)
    const fullIds = itemsForPackagePlan('advance').map(item => item.id)
    expect(fullIds).toEqual(expect.arrayContaining(coreIds))
    expect(fullIds.length).toBeGreaterThan(coreIds.length)
  })

  it('only keeps chat when an order is paid', () => {
    expect(shouldPersistChat({ paid: false })).toBe(false)
    expect(shouldPersistChat({ paid: true })).toBe(true)
  })

  it('stores a cloned transcript on the created order', () => {
    const messages = [{
      id: 'm1',
      role: 'user' as const,
      parts: [{ type: 'text' as const, text: '已上傳報告' }]
    }]
    const order = buildDemoOrder({
      packagePlanCode: 'basic',
      paymentMethod: 'card',
      invoice: 'cloud',
      invoiceCarrier: '/ABC1234',
      recipient,
      messages
    })

    expect(order.messages).toHaveLength(1)
    expect(order.messages[0]).not.toBe(messages[0])
    expect(order.packagePlanCode).toBe('basic')
    expect(order.productCodes).toEqual(['vitaminD', 'iron', 'vitaminC'])
    expect(order.timeline.map(step => step.id)).toEqual(shipmentStepIds)
    expect(timelineStatus(order.timeline)).toBe('confirmed')
    expect(order.amount).toBe(1280)
  })

  it('keeps the momo shipment steps in order', () => {
    expect(shipmentStepIds).toEqual(['confirmed', 'picking', 'shipped', 'delivered'])
  })

  it('treats the latest dated step as the current shipment status', () => {
    expect(timelineStatus([
      { id: 'confirmed', at: '2026-01-01T00:00:00.000Z' },
      { id: 'picking', at: '2026-01-02T00:00:00.000Z' },
      { id: 'shipped', at: null },
      { id: 'delivered', at: null }
    ])).toBe('picking')
  })

  it('exposes both month package plans in the demo catalog', () => {
    expect(Object.keys(demoPackagePlans)).toEqual(['basic', 'advance'])
  })

  it('rejects checkout without a recipient phone', () => {
    const parsed = checkoutSchema.safeParse({
      name: '林晏婷',
      phone: '',
      address: '台北市',
      paymentMethod: 'card',
      invoice: 'cloud',
      invoiceCarrier: '/ABC1234',
      packagePlanCode: 'basic'
    })
    expect(parsed.success).toBe(false)
  })

  it('accepts member invoice with email carrier', () => {
    const parsed = checkoutSchema.safeParse({
      name: '林晏婷',
      phone: '0912345678',
      address: '台北市',
      paymentMethod: 'card',
      invoice: 'member',
      invoiceCarrier: 'guest@example.com',
      packagePlanCode: 'basic'
    })
    expect(parsed.success).toBe(true)
  })

  it('accepts createOrder payload and binds messages', () => {
    const parsed = createOrderSchema.parse({
      packagePlanCode: 'advance',
      paymentMethod: 'linepay',
      invoice: 'donate',
      invoiceCarrier: '12345',
      recipient,
      messages: [{
        id: 'm1',
        role: 'assistant',
        parts: [{ type: 'text', text: '已讀到你的血檢' }]
      }]
    })

    expect(parsed.packagePlanCode).toBe('advance')
    expect(parsed.messages).toHaveLength(1)
  })

  it('persists uploadOffer in journey message snapshots', () => {
    const withOffer = snapshotChatMessage({
      id: 'a1',
      role: 'assistant',
      parts: [{ type: 'text', text: '可上傳報告對照數值' }],
      uploadOffer: true
    })
    expect(withOffer.uploadOffer).toBe(true)

    const withoutOffer = snapshotChatMessage({
      id: 'a2',
      role: 'assistant',
      parts: [{ type: 'text', text: '你好' }]
    })
    expect(withoutOffer.uploadOffer).toBeUndefined()
  })
})
