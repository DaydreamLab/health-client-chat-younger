import type { ChatMessage, CreateOrderInput, OrderRecord } from '../../app/utils/first-order'
import { mockCreateOrder } from '../../app/utils/first-order'

const orders = new Map<string, OrderRecord>()

export function memoryCreateOrder(input: CreateOrderInput) {
  const order = mockCreateOrder(input)
  orders.set(order.id, order)
  return order
}

export function memoryListOrders() {
  return [...orders.values()].sort((left, right) => {
    return right.createdAt.localeCompare(left.createdAt)
  })
}

export function memoryGetOrder(id: string) {
  return orders.get(id)
}

export function memoryGetOrderChat(id: string): ChatMessage[] {
  return orders.get(id)?.messages ?? []
}
