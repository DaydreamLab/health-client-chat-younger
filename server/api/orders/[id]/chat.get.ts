import { memoryGetOrder, memoryGetOrderChat } from '../../../utils/order-memory'

export default defineEventHandler((event) => {
  const id = getRouterParam(event, 'id')
  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'Missing order id' })
  }

  const order = memoryGetOrder(id)
  if (!order) {
    throw createError({ statusCode: 404, statusMessage: 'Order not found' })
  }

  return { messages: memoryGetOrderChat(id) }
})
