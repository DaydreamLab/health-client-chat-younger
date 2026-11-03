import { CandorApiError } from './candor-api'

/** core #146 envelope for 409 `expert_plan_reuse_mismatch`. */
export interface ExpertPlanReuseMismatchData {
  conversationId: string | null
  orderId: string | null
  orderNo: string | null
  existingExpertPlanCode: string | null
  existingExpertPlanPrice: number | null
  requestedExpertPlanCode: string | null
}

/**
 * True when POST /orders (expert_plan) returns 409 `expert_plan_reuse_mismatch`
 * (requested plan differs from unpaid existing order).
 */
export function isExpertPlanReuseMismatchError(err: unknown): err is CandorApiError {
  return err instanceof CandorApiError
    && err.statusCode === 409
    && err.errorCode === 'expert_plan_reuse_mismatch'
}

function readStringField(row: Record<string, unknown>, key: string): string | null {
  const raw = row[key]
  if (typeof raw !== 'string') {
    return null
  }
  const trimmed = raw.trim()
  return trimmed ? trimmed : null
}

export function parseExpertPlanReuseMismatchData(
  err: CandorApiError
): ExpertPlanReuseMismatchData {
  const data = err.errorData
  if (!data || typeof data !== 'object') {
    return {
      conversationId: null,
      orderId: null,
      orderNo: null,
      existingExpertPlanCode: null,
      existingExpertPlanPrice: null,
      requestedExpertPlanCode: null
    }
  }
  const row = data as Record<string, unknown>
  const priceRaw = row.existing_expert_plan_price
  const existingExpertPlanPrice = typeof priceRaw === 'number' && Number.isFinite(priceRaw)
    ? priceRaw
    : null
  return {
    conversationId: readStringField(row, 'conversation_id'),
    orderId: readStringField(row, 'order_id'),
    orderNo: readStringField(row, 'order_no'),
    existingExpertPlanCode: readStringField(row, 'existing_expert_plan_code'),
    existingExpertPlanPrice,
    requestedExpertPlanCode: readStringField(row, 'requested_expert_plan_code')
  }
}
