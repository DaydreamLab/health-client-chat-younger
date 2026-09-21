import type { ChatMessage, CreateOrderInput, OrderRecord, ReportAnalysis } from '~/utils/first-order'
import { mockCatalog, mockCreateOrder, mockReportAnalysis } from '~/utils/first-order'

const FETCH_MS = 4000

export function useFirstOrderApi() {
  const ordersStore = useOrdersStore()

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
    return ordersStore.list()
  }

  async function getOrder(id: string) {
    ordersStore.hydrate()
    const local = ordersStore.getById(id)
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
