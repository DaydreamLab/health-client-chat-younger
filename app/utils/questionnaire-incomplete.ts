import { CandorApiError } from './candor-api'

/** core #145 `error_data` on 422 `questionnaire_incomplete`. */
export interface QuestionnaireIncompleteData {
  missingFields: string[]
  conversationId: string | null
  /** Present on POST /order/{id}/expert-case/retry only — FE does not wire retry yet. */
  orderId: string | null
}

const PROFILE_FIELD_CODES = new Set(['sex', 'age', 'height', 'weight'])

/**
 * core #145 head 92e7bbc: GET /checkout/preview?mode=expert and POST /orders
 * (expert_plan) return 422 `questionnaire_incomplete` with envelope:
 * `{ error_code, error_data: { missing_fields, conversation_id } }`.
 * FE stores missing_fields but does not list them on screen (Irice 定案).
 */
export function isQuestionnaireIncompleteError(err: unknown): err is CandorApiError {
  return err instanceof CandorApiError
    && err.statusCode === 422
    && err.errorCode === 'questionnaire_incomplete'
}

export function parseQuestionnaireIncompleteData(err: CandorApiError): QuestionnaireIncompleteData {
  const data = err.errorData
  if (!data || typeof data !== 'object') {
    return { missingFields: [], conversationId: null, orderId: null }
  }
  const row = data as Record<string, unknown>
  const missingRaw = row.missing_fields
  const missingFields = Array.isArray(missingRaw)
    ? missingRaw.filter((field): field is string =>
        typeof field === 'string'
        && field.trim() !== ''
        && PROFILE_FIELD_CODES.has(field.trim()))
    : []
  const conversationRaw = row.conversation_id
  const conversationId = typeof conversationRaw === 'string' && conversationRaw.trim()
    ? conversationRaw.trim()
    : null
  const orderRaw = row.order_id
  const orderId = typeof orderRaw === 'string' && orderRaw.trim()
    ? orderRaw.trim()
    : null
  return { missingFields, conversationId, orderId }
}

/** @deprecated Prefer parseQuestionnaireIncompleteData — kept for call sites that only need fields. */
export function questionnaireMissingFields(err: CandorApiError): string[] {
  return parseQuestionnaireIncompleteData(err).missingFields
}
