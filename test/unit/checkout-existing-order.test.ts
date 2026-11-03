import { describe, expect, it } from 'vitest'
import {
  parseCheckoutExistingOrder,
  shouldRedirectExistingOrderToRepay
} from '../../app/utils/checkout-existing-order'

describe('checkout existing_order (core #146 repay reuse)', () => {
  it('parses order_id / order_no / expert_plan_code / payment_status', () => {
    expect(parseCheckoutExistingOrder({
      order_id: 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee',
      order_no: 'ORD-260101-000001',
      expert_plan_code: 'basic',
      payment_status: 'pending',
      extra: true
    })).toEqual({
      orderId: 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee',
      orderNo: 'ORD-260101-000001',
      expertPlanCode: 'basic',
      paymentStatus: 'pending'
    })
  })

  it('returns null for missing or non-object existing_order', () => {
    expect(parseCheckoutExistingOrder(null)).toBeNull()
    expect(parseCheckoutExistingOrder(undefined)).toBeNull()
    expect(parseCheckoutExistingOrder('x')).toBeNull()
  })

  it('redirects to repay when order_id present and payment repayable', () => {
    expect(shouldRedirectExistingOrderToRepay({
      orderId: 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee',
      orderNo: 'ORD-1',
      expertPlanCode: 'basic',
      paymentStatus: 'pending'
    })).toBe(true)
    expect(shouldRedirectExistingOrderToRepay({
      orderId: 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee',
      orderNo: 'ORD-1',
      expertPlanCode: null,
      paymentStatus: null
    })).toBe(true)
  })

  it('does not redirect without order_id or when paid', () => {
    expect(shouldRedirectExistingOrderToRepay({
      orderId: null,
      orderNo: null,
      expertPlanCode: 'basic',
      paymentStatus: 'pending'
    })).toBe(false)
    expect(shouldRedirectExistingOrderToRepay({
      orderId: 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee',
      orderNo: 'ORD-1',
      expertPlanCode: 'basic',
      paymentStatus: 'paid'
    })).toBe(false)
  })
})
