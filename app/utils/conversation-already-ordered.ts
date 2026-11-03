import { CandorApiError } from './candor-api'

/** Anticipated core envelope for 409 `conversation_already_ordered`. */
export interface ConversationAlreadyOrderedData {
  conversationId: string | null
  orderId: string | null
  orderNo: string | null
  expertCaseId: string | null
}

/**
 * True when checkout preview / expert_plan create returns
 * 409 `conversation_already_ordered` (對話綁一張訂單).
 */
export function isConversationAlreadyOrderedError(err: unknown): err is CandorApiError {
  return err instanceof CandorApiError
    && err.statusCode === 409
    && err.errorCode === 'conversation_already_ordered'
}

function readUuidField(row: Record<string, unknown>, key: string): string | null {
  const raw = row[key]
  if (typeof raw !== 'string') {
    return null
  }
  const trimmed = raw.trim()
  return trimmed ? trimmed : null
}

export function parseConversationAlreadyOrderedData(
  err: CandorApiError
): ConversationAlreadyOrderedData {
  const data = err.errorData
  if (!data || typeof data !== 'object') {
    return {
      conversationId: null,
      orderId: null,
      orderNo: null,
      expertCaseId: null
    }
  }
  const row = data as Record<string, unknown>
  const orderNoRaw = row.order_no
  const orderNo = typeof orderNoRaw === 'string' && orderNoRaw.trim()
    ? orderNoRaw.trim()
    : null
  return {
    conversationId: readUuidField(row, 'conversation_id'),
    orderId: readUuidField(row, 'order_id'),
    orderNo,
    expertCaseId: readUuidField(row, 'expert_case_id')
  }
}

/**
 * With expert_case_id (+ order_id) → open order detail.
 * Otherwise → return to chat (caller supplies conversation fallback).
 */
export function conversationAlreadyOrderedAction(
  data: ConversationAlreadyOrderedData
): { kind: 'order', orderId: string } | { kind: 'chat', conversationId: string | null } {
  if (data.orderId && data.expertCaseId) {
    return { kind: 'order', orderId: data.orderId }
  }
  return { kind: 'chat', conversationId: data.conversationId }
}
