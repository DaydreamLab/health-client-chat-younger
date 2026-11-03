import { describe, expect, it } from 'vitest'
import { CandorApiError } from '../../app/utils/candor-api'
import {
  conversationAlreadyOrderedAction,
  isConversationAlreadyOrderedError,
  parseConversationAlreadyOrderedData
} from '../../app/utils/conversation-already-ordered'

describe('conversation_already_ordered (core #146)', () => {
  it('parses error_data conversation_id / order_id / order_no / expert_case_id', () => {
    const err = new CandorApiError(
      'Conversation already has a valid expert-plan order.',
      409,
      'conversation_already_ordered',
      {
        conversation_id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
        order_id: 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee',
        order_no: 'ORD-260101-000001',
        expert_case_id: 'ffffffff-ffff-ffff-ffff-ffffffffffff'
      }
    )
    expect(isConversationAlreadyOrderedError(err)).toBe(true)
    expect(parseConversationAlreadyOrderedData(err)).toEqual({
      conversationId: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
      orderId: 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee',
      orderNo: 'ORD-260101-000001',
      expertCaseId: 'ffffffff-ffff-ffff-ffff-ffffffffffff'
    })
  })

  it('routes to order when order_id is present (expert_case_id optional)', () => {
    expect(conversationAlreadyOrderedAction({
      conversationId: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
      orderId: 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee',
      orderNo: 'ORD-260101-000001',
      expertCaseId: 'ffffffff-ffff-ffff-ffff-ffffffffffff'
    })).toEqual({
      kind: 'order',
      orderId: 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee'
    })
    expect(conversationAlreadyOrderedAction({
      conversationId: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
      orderId: 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee',
      orderNo: 'ORD-260101-000001',
      expertCaseId: null
    })).toEqual({
      kind: 'order',
      orderId: 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee'
    })
  })

  it('routes to chat only when order_id is missing', () => {
    expect(conversationAlreadyOrderedAction({
      conversationId: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
      orderId: null,
      orderNo: null,
      expertCaseId: null
    })).toEqual({
      kind: 'chat',
      conversationId: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
    })
  })

  it('rejects other 409 codes', () => {
    const err = new CandorApiError('conflict', 409, 'conversation_case_exists', {
      expert_case_id: 'ffffffff-ffff-ffff-ffff-ffffffffffff',
      order_id: 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee'
    })
    expect(isConversationAlreadyOrderedError(err)).toBe(false)
  })

  it('tolerates missing or blank error_data fields', () => {
    expect(parseConversationAlreadyOrderedData(
      new CandorApiError('x', 409, 'conversation_already_ordered', null)
    )).toEqual({
      conversationId: null,
      orderId: null,
      orderNo: null,
      expertCaseId: null
    })
    expect(parseConversationAlreadyOrderedData(
      new CandorApiError('x', 409, 'conversation_already_ordered', {
        conversation_id: '  ',
        order_id: 1,
        order_no: '',
        expert_case_id: null
      })
    )).toEqual({
      conversationId: null,
      orderId: null,
      orderNo: null,
      expertCaseId: null
    })
    expect(conversationAlreadyOrderedAction({
      conversationId: null,
      orderId: null,
      orderNo: null,
      expertCaseId: null
    })).toEqual({ kind: 'chat', conversationId: null })
  })
})
