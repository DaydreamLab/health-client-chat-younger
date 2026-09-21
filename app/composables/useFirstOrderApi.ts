import type { ChatMessage, CreateOrderInput, OrderRecord, ReportAnalysis } from '~/utils/first-order'
import { mockCatalog, mockCreateOrder, mockReportAnalysis } from '~/utils/first-order'

export function useFirstOrderApi() {
  const ordersStore = useOrdersStore()

  async function analyzeReport(input: { locale?: string, fileName?: string } = {}) {
    try {
      return await $fetch<ReportAnalysis>('/api/report', {
        method: 'POST',
        body: input
      })
    } catch {
      return mockReportAnalysis(input.locale)
    }
  }

  async function getCatalog() {
    try {
      return await $fetch<ReturnType<typeof mockCatalog>>('/api/supplements')
    } catch {
      return mockCatalog()
    }
  }

  async function createOrder(input: CreateOrderInput) {
    let order: OrderRecord
    try {
      order = await $fetch<OrderRecord>('/api/orders', {
        method: 'POST',
        body: input
      })
    } catch {
      order = mockCreateOrder(input)
    }

    ordersStore.add(order)
    return order
  }

  async function listOrders() {
    try {
      const remote = await $fetch<OrderRecord[]>('/api/orders')
      for (const order of remote) {
        ordersStore.add(order)
      }
    } catch {
      ordersStore.hydrate()
    }

    return ordersStore.list()
  }

  async function getOrder(id: string) {
    const local = ordersStore.getById(id)
    if (local) {
      return local
    }

    try {
      const order = await $fetch<OrderRecord>(`/api/orders/${id}`)
      ordersStore.add(order)
      return order
    } catch {
      return null
    }
  }

  async function getOrderChat(id: string) {
    const local = ordersStore.getById(id)
    if (local) {
      return local.messages
    }

    try {
      const payload = await $fetch<{ messages: ChatMessage[] }>(`/api/orders/${id}/chat`)
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
