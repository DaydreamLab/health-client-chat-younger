import { describe, expect, it } from 'vitest'
import { checkoutSchema, createOrderSchema } from '../../app/utils/checkout-schema'
import {
  formatTwd,
  itemsForPlan,
  mockCatalog,
  mockCreateOrder,
  shipmentStepIds,
  shouldPersistChat,
  supplementPlans,
  timelineStatus
} from '../../app/utils/first-order'

const recipient = {
  name: '林晏婷',
  phone: '0912345678',
  address: '台北市',
  email: 'guest@example.com'
}

describe('first-order demo', () => {
  it('prices one-month Basic Care below Full Tune', () => {
    expect(supplementPlans.basicCare.price).toBe(1280)
    expect(supplementPlans.fullTune.price).toBe(1980)
    expect(supplementPlans.basicCare.durationMonths).toBe(1)
    expect(supplementPlans.fullTune.durationMonths).toBe(1)
    expect(formatTwd(1280)).toBe('NT$1,280')
  })

  it('does not let Full Tune drop core items', () => {
    const coreIds = itemsForPlan('basicCare').map(item => item.id)
    const fullIds = itemsForPlan('fullTune').map(item => item.id)
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
    const order = mockCreateOrder({
      packagePlanCode: 'basicCare',
      paymentMethod: 'card',
      invoice: 'cloud',
      recipient,
      messages
    })

    expect(order.messages).toHaveLength(1)
    expect(order.messages[0]).not.toBe(messages[0])
    expect(order.packagePlanCode).toBe('basicCare')
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

  it('exposes both month packages in the catalog', () => {
    const catalog = mockCatalog()
    expect(catalog.plans.map(plan => plan.id)).toEqual(['basicCare', 'fullTune'])
    expect(catalog.chart.length).toBeGreaterThan(0)
  })

  it('rejects checkout without a recipient phone', () => {
    const parsed = checkoutSchema.safeParse({
      name: '林晏婷',
      phone: '',
      address: '台北市',
      paymentMethod: 'card',
      invoice: 'cloud',
      packagePlanCode: 'basic'
    })
    expect(parsed.success).toBe(false)
  })

  it('accepts createOrder payload and binds messages', () => {
    const parsed = createOrderSchema.parse({
      packagePlanCode: 'advance',
      paymentMethod: 'linepay',
      invoice: 'donate',
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
})
