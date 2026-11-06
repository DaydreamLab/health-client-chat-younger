/**
 * 預約專家 API 模組（型別化集中呼叫）。
 *
 * ⚠️ candor-core 尚未合併；下列路徑／欄位依規格推定，對齊後再改此檔即可。
 *
 * 假設端點：
 * - `GET  /expert-booking/product` → ExpertBookingProduct
 * - `POST /expert-bookings` → OrderCreated（建待付款訂單＋預約需求）
 * - `POST /expert-bookings/attachments`（multipart）→ `{ id }`
 * - `GET  /order/{id}` 附加 `expert_booking` 區塊（見 ExpertBookingOnOrder）
 */

import type { OrderCreated } from '~/utils/candor-api'
import { CandorApiError } from '~/utils/candor-api'
import type {
  ExpertBookingCreateRequest,
  ExpertBookingProduct
} from '~/utils/expert-booking'
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
  async function createBooking(body: ExpertBookingCreateRequest): Promise<OrderCreated> {
    return candor.createExpertBooking(body)
  }

  /**
   * 選填附件上傳。core 未就緒時回 501／404 → 回傳 null（表單仍可送出）。
   */
  async function uploadAttachment(file: File): Promise<string | null> {
    try {
      const ack = await candor.uploadExpertBookingAttachment(file)
      return ack.id
    } catch (error) {
      if (error instanceof CandorApiError
        && (error.statusCode === 404 || error.statusCode === 501)) {
        return null
      }
      throw error
    }
  }

  return {
    getProduct,
    createBooking,
    uploadAttachment,
    fallbackProduct: FALLBACK_PRODUCT
  }
}
