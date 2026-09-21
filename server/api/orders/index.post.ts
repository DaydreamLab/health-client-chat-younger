import { createOrderSchema } from '../../../app/utils/checkout-schema'
import { memoryCreateOrder } from '../../utils/order-memory'

export default defineEventHandler(async (event) => {
  const parsed = createOrderSchema.safeParse(await readBody(event))

  if (!parsed.success) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid order' })
  }

  return memoryCreateOrder(parsed.data)
})
