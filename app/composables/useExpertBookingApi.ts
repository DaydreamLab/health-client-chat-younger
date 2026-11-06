/**
 * 預約專家 API（對齊 candor-core PR #155 / OpenAPI public）。
 *
 * - `GET  /expert-booking-product`
 * - `POST /expert-booking-attachments`（multipart `file`）
 * - `POST /orders`（`kind=expert_booking` + `expert_booking`）
 * - 重新付款：既有 `POST /order/{id}/payment`（OpenAPI `ordersCreatePayment`）
 */

import type { OrderCreateRequest, OrderCreated } from '~/utils/candor-api'
import { CandorApiError } from '~/utils/candor-api'
import type {
  ExpertBookingAttachment,
  ExpertBookingProduct
} from '~/utils/expert-booking'
import {
  EXPERT_BOOKING_PRICE_TWD,
  EXPERT_BOOKING_PRODUCT_CODE
} from '~/utils/expert-booking'

const FALLBACK_PRODUCT: ExpertBookingProduct = {
  code: EXPERT_BOOKING_PRODUCT_CODE,
  name_zh: '預約專家',
  name_en: 'Book an expert',
  description: null,
  price: EXPERT_BOOKING_PRICE_TWD
}

export function useExpertBookingApi() {
  const candor = useCandorApi()

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

  /** 選填附件：先上傳拿 key，再放入 orders.expert_booking.attachments。 */
  async function uploadAttachment(file: File): Promise<ExpertBookingAttachment> {
    return candor.uploadExpertBookingAttachment(file)
  }

  async function createBooking(body: OrderCreateRequest): Promise<OrderCreated> {
    return candor.createOrder(body)
  }

  return {
    getProduct,
    uploadAttachment,
    createBooking,
    fallbackProduct: FALLBACK_PRODUCT
  }
}
