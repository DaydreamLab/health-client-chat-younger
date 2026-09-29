import type { CreateOrderInput, OrderRecord, PaymentMethod } from '~/utils/first-order'
import {
  orderRecordFromCandorCreated,
  orderRecordFromCandorDetail,
  orderRecordFromCandorSummary
} from '~/utils/first-order'
import type { OrderCreated, OrderPaymentCreated } from '~/utils/candor-api'

export function useFirstOrderApi() {
  const ordersStore = useOrdersStore()
  const candor = useCandorApi()

  async function createOrder(input: CreateOrderInput): Promise<OrderCreated> {
    const token = candor.readToken()
    if (!token || !input.compositionHash) {
      throw new Error('auth_required')
    }
    const reportId = input.reportId?.trim()
    const created = await candor.createOrder({
      lines: [{
        kind: 'package',
        package_plan_code: input.packagePlanCode,
        composition_hash: input.compositionHash,
        ...(reportId ? { report_id: reportId } : {})
      }],
      payment_method: input.paymentMethod,
      invoice_type: input.invoice,
      invoice_carrier: input.invoiceCarrier,
      recipient: {
        name: input.recipient.name,
        phone: input.recipient.phone,
        address: input.recipient.address,
        ...(input.recipient.email ? { email: input.recipient.email } : {})
      },
      ...(input.conversationId ? { conversation_id: input.conversationId } : {}),
      ...(input.recommendationRunId ? { recommendation_run_id: input.recommendationRunId } : {})
    })
    const order = orderRecordFromCandorCreated(created, input)
    ordersStore.add(order)
    return created
  }

  async function listOrders() {
    ordersStore.hydrate()
    const token = candor.readToken()
    if (!token) {
      return ordersStore.list()
    }
    const payload = await candor.listOrders()
    const mapped = payload.orders.map(summary => orderRecordFromCandorSummary(summary))
    for (const order of mapped) {
      ordersStore.add(order)
    }
    return mapped
  }

  async function getOrder(id: string) {
    ordersStore.hydrate()
    const local = ordersStore.getById(id)
    const token = candor.readToken()
    if (!token) {
      return local ?? null
    }
    const detail = await candor.getOrder(id)
    const fallback = local
      ? {
          packagePlanCode: local.packagePlanCode,
          packageName: local.packageName,
          paymentMethod: local.paymentMethod,
          invoice: local.invoice,
          recipient: local.recipient,
          messages: local.messages,
          productCodes: local.productCodes,
          productNames: local.productNames
        }
      : {}
    const order = orderRecordFromCandorDetail(detail, fallback)
    ordersStore.add(order)
    return order
  }

  async function getOrderChat(id: string) {
    ordersStore.hydrate()
    const local = ordersStore.getById(id)
    const token = candor.readToken()
    if (token) {
      try {
        const payload = await candor.getOrderMessages(id)
        return payload.messages.map(message => ({
          id: message.id,
          role: message.role === 'user' ? 'user' as const : 'assistant' as const,
          parts: [{ type: 'text' as const, text: message.content }]
        }))
      } catch {
        // fall through to local
      }
    }
    return local?.messages ?? []
  }

  async function repayOrder(
    id: string,
    paymentMethod: PaymentMethod
  ): Promise<OrderPaymentCreated> {
    const token = candor.readToken()
    if (!token) {
      throw new Error('auth_required')
    }
    const created = await candor.createOrderPayment(id, { payment_method: paymentMethod })
    const local = ordersStore.getById(id)
    if (local) {
      ordersStore.add({
        ...local,
        paymentStatus: created.payment_status,
        orderStatus: created.status,
        paymentMethod
      })
    }
    return created
  }

  async function cancelOrder(
    id: string,
    body: { cancel_reason?: string | null } = {}
  ): Promise<OrderRecord> {
    const token = candor.readToken()
    if (!token) {
      throw new Error('auth_required')
    }
    const detail = await candor.cancelOrder(id, body)
    const local = ordersStore.getById(id)
    const order = orderRecordFromCandorDetail(detail, local
      ? {
          packagePlanCode: local.packagePlanCode,
          packageName: local.packageName,
          paymentMethod: local.paymentMethod,
          invoice: local.invoice,
          recipient: local.recipient,
          messages: local.messages,
          productCodes: local.productCodes,
          productNames: local.productNames
        }
      : {})
    ordersStore.add(order)
    return order
  }

  return {
    createOrder,
    listOrders,
    getOrder,
    getOrderChat,
    repayOrder,
    cancelOrder
  }
}
