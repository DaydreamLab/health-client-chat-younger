import { CandorApiError } from './candor-api'

/** Anticipated core envelope for 409 `conversation_order_closed`. */
export interface ConversationOrderClosedData {
  conversationId: string | null
  orderId: string | null
  orderNo: string | null
  reason: string | null
}

/**
 * True when checkout preview / expert_plan create returns
 * 409 `conversation_order_closed` (cancelled／refunded — must start a new conversation).
 */
export function isConversationOrderClosedError(err: unknown): err is CandorApiError {
  return err instanceof CandorApiError
    && err.statusCode === 409
    && err.errorCode === 'conversation_order_closed'
}

function readStringField(row: Record<string, unknown>, key: string): string | null {
  const raw = row[key]
  if (typeof raw !== 'string') {
    return null
  }
  const trimmed = raw.trim()
  return trimmed ? trimmed : null
}

export function parseConversationOrderClosedData(
  err: CandorApiError
): ConversationOrderClosedData {
  const data = err.errorData
  if (!data || typeof data !== 'object') {
    return {
      conversationId: null,
      orderId: null,
      orderNo: null,
      reason: null
    }
  }
  const row = data as Record<string, unknown>
  return {
    conversationId: readStringField(row, 'conversation_id'),
    orderId: readStringField(row, 'order_id'),
    orderNo: readStringField(row, 'order_no'),
    reason: readStringField(row, 'reason')
  }
}
