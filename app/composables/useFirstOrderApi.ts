import type { ChatMessage, CreateOrderInput, OrderRecord, ReportAnalysis } from '~/utils/first-order'
import {
  mockCatalog,
  mockCreateOrder,
  mockReportAnalysis,
  orderRecordFromCandorCreated,
  orderRecordFromCandorDetail,
  orderRecordFromCandorSummary
} from '~/utils/first-order'

const FETCH_MS = 4000

export function useFirstOrderApi() {
  const ordersStore = useOrdersStore()
  const candor = useCandorApi()

  async function analyzeReport(input: { locale?: string, fileName?: string } = {}) {
    try {
      return await $fetch<ReportAnalysis>('/api/report', {
        method: 'POST',
        body: input,
        timeout: FETCH_MS
      })
    } catch {
      return mockReportAnalysis(input.locale)
    }
  }

  async function getCatalog() {
    try {
      return await $fetch<ReturnType<typeof mockCatalog>>('/api/supplements', {
        timeout: FETCH_MS
      })
    } catch {
      return mockCatalog()
    }
  }

  async function createOrder(input: CreateOrderInput) {
    const token = candor.readToken()
    if (token && input.compositionHash) {
      try {
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
          invoice_carrier: '',
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
        return order
      } catch {
        // fall through to local BFF / mock
      }
    }

    let order: OrderRecord
    try {
      order = await $fetch<OrderRecord>('/api/orders', {
        method: 'POST',
        body: input,
        timeout: FETCH_MS
      })
    } catch {
      order = mockCreateOrder(input)
    }

    ordersStore.add(order)
    return order
  }

  async function listOrders() {
    ordersStore.hydrate()
    const token = candor.readToken()
    if (token) {
      try {
        const payload = await candor.listOrders()
        for (const summary of payload.orders) {
          const mapped = orderRecordFromCandorSummary(summary)
          const existing = ordersStore.getById(mapped.id)
          if (existing) {
            ordersStore.add({ ...existing, ...mapped, productCodes: existing.productCodes })
          } else {
            ordersStore.add(mapped)
          }
        }
      } catch {
        // keep local store only
      }
    }
    return ordersStore.list()
  }

  async function getOrder(id: string) {
    ordersStore.hydrate()
    const local = ordersStore.getById(id)
    const token = candor.readToken()
    if (token) {
      try {
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
      } catch {
        // fall through
      }
    }
    if (local) {
      return local
    }

    try {
      const order = await $fetch<OrderRecord>(`/api/orders/${id}`, {
        timeout: FETCH_MS
      })
      ordersStore.add(order)
      return order
    } catch {
      return null
    }
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
        // fall through
      }
    }
    if (local) {
      return local.messages
    }

    try {
      const payload = await $fetch<{ messages: ChatMessage[] }>(`/api/orders/${id}/chat`, {
        timeout: FETCH_MS
      })
      return payload.messages
    } catch {
      return []
    }
  }

  return {
    analyzeReport,
    getCatalog,
    createOrder,
    listOrders,
    getOrder,
    getOrderChat
  }
}
