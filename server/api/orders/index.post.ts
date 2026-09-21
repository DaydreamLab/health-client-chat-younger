import { isSupplementPlanId, type ChatMessage, type InvoiceType, type PaymentMethod } from '../../../app/utils/first-order'
import { memoryCreateOrder } from '../../utils/order-memory'

export default defineEventHandler(async (event) => {
  const body = await readBody<{
    planId?: string
    paymentMethod?: PaymentMethod
    invoice?: InvoiceType
    recipient?: {
      name?: string
      phone?: string
      address?: string
      email?: string
    }
    messages?: ChatMessage[]
  }>(event)

  if (!isSupplementPlanId(body.planId)) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid plan' })
  }

  if (!body.recipient?.name || !body.recipient.phone || !body.recipient.address) {
    throw createError({ statusCode: 400, statusMessage: 'Missing recipient' })
  }

  const paymentMethod = body.paymentMethod === 'linepay' || body.paymentMethod === 'atm'
    ? body.paymentMethod
    : 'card'
  const invoice = body.invoice === 'company' || body.invoice === 'donate'
    ? body.invoice
    : 'cloud'

  return memoryCreateOrder({
    planId: body.planId,
    paymentMethod,
    invoice,
    recipient: {
      name: body.recipient.name,
      phone: body.recipient.phone,
      address: body.recipient.address,
      email: body.recipient.email ?? ''
    },
    messages: Array.isArray(body.messages) ? body.messages : []
  })
})
