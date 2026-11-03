import { describe, expect, it } from 'vitest'
import { CandorApiError } from '../../app/utils/candor-api'
import {
  isConversationOrderClosedError,
  parseConversationOrderClosedData
} from '../../app/utils/conversation-order-closed'

describe('conversation_order_closed (cancelled／refunded)', () => {
  it('parses error_data conversation_id / order_id / order_no / reason', () => {
    const err = new CandorApiError(
      'Conversation order is closed.',
      409,
      'conversation_order_closed',
      {
        conversation_id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
        order_id: 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee',
        order_no: 'ORD-260101-000001',
        reason: 'cancelled'
      }
    )
    expect(isConversationOrderClosedError(err)).toBe(true)
    expect(parseConversationOrderClosedData(err)).toEqual({
      conversationId: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
      orderId: 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee',
      orderNo: 'ORD-260101-000001',
      reason: 'cancelled'
    })
  })

  it('rejects other 409 codes', () => {
    expect(isConversationOrderClosedError(
      new CandorApiError('x', 409, 'conversation_already_ordered', null)
    )).toBe(false)
  })

  it('tolerates missing or blank error_data fields', () => {
    expect(parseConversationOrderClosedData(
      new CandorApiError('x', 409, 'conversation_order_closed', null)
    )).toEqual({
      conversationId: null,
      orderId: null,
      orderNo: null,
      reason: null
    })
    expect(parseConversationOrderClosedData(
      new CandorApiError('x', 409, 'conversation_order_closed', {
        conversation_id: '  ',
        order_id: 1,
        order_no: '',
        reason: 'refunded'
      })
    )).toEqual({
      conversationId: null,
      orderId: null,
      orderNo: null,
      reason: 'refunded'
    })
  })
})
