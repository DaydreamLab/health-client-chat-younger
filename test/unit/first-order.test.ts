import { describe, expect, it } from 'vitest'
import {
  formatTwd,
  itemsForPlan,
  mockCreateOrder,
  shipmentStepIds,
  shouldPersistChat,
  supplementPlans,
  timelineStatus
} from '../../app/utils/first-order'

describe('first-order demo', () => {
  it('prices Basic Care below Full Tune', () => {
    expect(supplementPlans.basicCare.price).toBe(1280)
    expect(supplementPlans.fullTune.price).toBe(1980)
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

  it('stores the transcript on the created order', () => {
    const order = mockCreateOrder({
      planId: 'basicCare',
      paymentMethod: 'card',
      invoice: 'cloud',
      recipient: {
        name: '林晏婷',
        phone: '0912345678',
        address: '台北市',
        email: 'guest@example.com'
      },
      messages: [{
        id: 'm1',
        role: 'user',
        parts: [{ type: 'text', text: '已上傳報告' }]
      }]
    })

    expect(order.messages).toHaveLength(1)
    expect(order.itemIds).toEqual(['vitaminD', 'iron', 'vitaminC'])
    expect(order.timeline.map(step => step.id)).toEqual(shipmentStepIds)
    expect(timelineStatus(order.timeline)).toBe('confirmed')
    expect(order.amount).toBe(1280)
  })

  it('keeps the momo shipment steps in order', () => {
    expect(shipmentStepIds).toEqual(['confirmed', 'picking', 'shipped', 'delivered'])
  })
})
