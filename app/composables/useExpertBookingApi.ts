/**
 * 預約專家 API 模組（型別化集中呼叫）。
 *
 * 對齊 candor-core PR #155：
 * - `GET  /expert-booking-product` → ExpertBookingProduct
 * - `POST /orders`（`lines[].kind=expert_booking` + `expert_booking`）→ OrderCreated
 * - `GET  /order/{id}` → `expert_booking` 區塊
 * - 重新付款沿用既有 `POST /order/{id}/payment`（useFirstOrderApi.repayOrder）
 *
 * core 無附件上傳端點；本模組不提供 upload。
 */

import type { OrderCreateRequest, OrderCreated } from '~/utils/candor-api'
import { CandorApiError } from '~/utils/candor-api'
import type { ExpertBookingProduct } from '~/utils/expert-booking'
import {
  EXPERT_BOOKING_PRICE_TWD,
  EXPERT_BOOKING_PRODUCT_CODE
} from '~/utils/expert-booking'

const FALLBACK_PRODUCT: ExpertBookingProduct = {
  code: EXPERT_BOOKING_PRODUCT_CODE,
  name: '預約專家',
  price: EXPERT_BOOKING_PRICE_TWD,
  currency: 'TWD'
}

export function useExpertBookingApi() {
  const candor = useCandorApi()

  /**
   * 商品資訊。core 未就緒時回傳規格預設 NT$6,000（仍嘗試打 API）。
   */
  async function getProduct(): Promise<ExpertBookingProduct> {
    try {
      return await candor.getExpertBookingProduct()
    } catch (error) {
      if (error instanceof CandorApiError
        && (error.statusCode === 404 || error.statusCode === 501)) {
        return FALLBACK_PRODUCT
      }
      throw error
    }
  }

  /** 建立待付款訂單＋預約需求；付款成功後才進專家待處理。 */
  async function createBooking(body: OrderCreateRequest): Promise<OrderCreated> {
    return candor.createOrder(body)
  }

  return {
    getProduct,
    createBooking,
    fallbackProduct: FALLBACK_PRODUCT
  }
}
