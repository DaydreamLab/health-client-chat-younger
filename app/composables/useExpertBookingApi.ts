/**
 * 預約專家 API（對齊 candor-core OpenAPI public + expert-booking-product 合約）。
 *
 * - `GET  /expert-booking-product`（下架 → 404 `expert_booking_unavailable`）
 * - `POST /expert-booking-attachments`（multipart `file`）
 * - `POST /orders`（`kind=expert_booking` + `expert_booking`；下架 → 409）
 * - 重新付款：既有 `POST /order/{id}/payment`（OpenAPI `ordersCreatePayment`）
 */

import type { OrderCreateRequest, OrderCreated } from '~/utils/candor-api'
import type {
  ExpertBookingAttachment,
  ExpertBookingProduct
} from '~/utils/expert-booking'

export function useExpertBookingApi() {
  const candor = useCandorApi()

  /** 上架商品；下架時拋 CandorApiError（404／expert_booking_unavailable），不退回假價格。 */
  async function getProduct(): Promise<ExpertBookingProduct> {
    return candor.getExpertBookingProduct()
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
    createBooking
  }
}
