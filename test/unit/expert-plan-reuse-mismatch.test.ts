import { describe, expect, it } from 'vitest'
import { CandorApiError } from '../../app/utils/candor-api'
import {
  isExpertPlanReuseMismatchError,
  parseExpertPlanReuseMismatchData
} from '../../app/utils/expert-plan-reuse-mismatch'

describe('expert_plan_reuse_mismatch (core #146)', () => {
  it('parses error_data fields', () => {
    const err = new CandorApiError(
      'Requested expert plan does not match the unpaid order.',
      409,
      'expert_plan_reuse_mismatch',
      {
        conversation_id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
        order_id: 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee',
        order_no: 'ORD-260101-000001',
        existing_expert_plan_code: 'basic',
        existing_expert_plan_price: 6000,
        requested_expert_plan_code: 'advance'
      }
    )
    expect(isExpertPlanReuseMismatchError(err)).toBe(true)
    expect(parseExpertPlanReuseMismatchData(err)).toEqual({
      conversationId: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
      orderId: 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee',
      orderNo: 'ORD-260101-000001',
      existingExpertPlanCode: 'basic',
      existingExpertPlanPrice: 6000,
      requestedExpertPlanCode: 'advance'
    })
  })

  it('rejects conversation_already_ordered', () => {
    const err = new CandorApiError(
      'paid',
      409,
      'conversation_already_ordered',
      { order_id: 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee' }
    )
    expect(isExpertPlanReuseMismatchError(err)).toBe(false)
  })

  it('tolerates missing or blank error_data fields', () => {
    expect(parseExpertPlanReuseMismatchData(
      new CandorApiError('x', 409, 'expert_plan_reuse_mismatch', null)
    )).toEqual({
      conversationId: null,
      orderId: null,
      orderNo: null,
      existingExpertPlanCode: null,
      existingExpertPlanPrice: null,
      requestedExpertPlanCode: null
    })
    expect(parseExpertPlanReuseMismatchData(
      new CandorApiError('x', 409, 'expert_plan_reuse_mismatch', {
        conversation_id: '  ',
        order_id: 1,
        order_no: '',
        existing_expert_plan_code: null,
        existing_expert_plan_price: '6000',
        requested_expert_plan_code: 'advance'
      })
    )).toEqual({
      conversationId: null,
      orderId: null,
      orderNo: null,
      existingExpertPlanCode: null,
      existingExpertPlanPrice: null,
      requestedExpertPlanCode: 'advance'
    })
  })
})
