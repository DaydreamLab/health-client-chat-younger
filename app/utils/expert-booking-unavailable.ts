import { CandorApiError } from './candor-api'

/**
 * GET /expert-booking-product → 404 `expert_booking_unavailable`（下架）
 * POST /orders kind=expert_booking → 409 `expert_booking_unavailable`
 */
export function isExpertBookingUnavailableError(err: unknown): err is CandorApiError {
  if (!(err instanceof CandorApiError)) {
    return false
  }
  if (err.errorCode === 'expert_booking_unavailable') {
    return err.statusCode === 404 || err.statusCode === 409
  }
  // GET 下架約定為 404；無 error_code 時仍視為暫停預約（勿退回假價格）
  return err.statusCode === 404
}
