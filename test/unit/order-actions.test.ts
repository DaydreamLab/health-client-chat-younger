import { describe, expect, it } from 'vitest'
import { canCancelOrder, canRepayOrder } from '../../app/utils/order-actions'

describe('order-actions', () => {
  it('allows repay when unpaid, failed, or expired', () => {
    expect(canRepayOrder({ orderStatus: 'created', paymentStatus: 'unpaid' })).toBe(true)
    expect(canRepayOrder({ orderStatus: 'created', paymentStatus: 'failed' })).toBe(true)
    expect(canRepayOrder({ orderStatus: 'created', paymentStatus: 'expired' })).toBe(true)
  })

  it('hides repay when paid, pending, or cancelled', () => {
    expect(canRepayOrder({ orderStatus: 'created', paymentStatus: 'paid' })).toBe(false)
    expect(canRepayOrder({ orderStatus: 'created', paymentStatus: 'pending' })).toBe(false)
    expect(canRepayOrder({ orderStatus: 'cancelled', paymentStatus: 'unpaid' })).toBe(false)
  })

  it('allows cancel only for created unpaid orders', () => {
    expect(canCancelOrder({ orderStatus: 'created', paymentStatus: 'unpaid' })).toBe(true)
    expect(canCancelOrder({ orderStatus: 'created', paymentStatus: 'pending' })).toBe(true)
    expect(canCancelOrder({ orderStatus: 'created', paymentStatus: 'failed' })).toBe(true)
    expect(canCancelOrder({ orderStatus: 'created', paymentStatus: 'paid' })).toBe(false)
    expect(canCancelOrder({ orderStatus: 'confirmed', paymentStatus: 'paid' })).toBe(false)
    expect(canCancelOrder({ orderStatus: 'cancelled', paymentStatus: 'unpaid' })).toBe(false)
  })
})
