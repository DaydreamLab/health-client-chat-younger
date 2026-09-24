import { z } from 'zod'

export const paymentMethodSchema = z.enum(['card', 'linepay', 'atm'])
export const invoiceTypeSchema = z.enum(['cloud', 'company', 'donate'])
export const packagePlanCodeSchema = z.string().trim().min(1)

export const checkoutSchema = z.object({
  name: z.string().trim().min(1),
  phone: z.string().trim().min(8),
  address: z.string().trim().min(1),
  paymentMethod: paymentMethodSchema,
  invoice: invoiceTypeSchema,
  packagePlanCode: packagePlanCodeSchema
})

export const recipientSchema = z.object({
  name: z.string().trim().min(1),
  phone: z.string().trim().min(8),
  address: z.string().trim().min(1),
  email: z.string().trim()
})

const chatPartSchema = z.object({
  type: z.enum(['text', 'file']),
  text: z.string().optional(),
  name: z.string().optional()
})

export const chatMessageSchema = z.object({
  id: z.string().min(1),
  role: z.enum(['user', 'assistant']),
  parts: z.array(chatPartSchema)
})

export const createOrderSchema = z.object({
  packagePlanCode: packagePlanCodeSchema,
  amount: z.number().int().nonnegative().optional(),
  productCodes: z.array(z.string()).optional(),
  productNames: z.array(z.string()).optional(),
  paymentMethod: paymentMethodSchema,
  invoice: invoiceTypeSchema,
  recipient: recipientSchema,
  messages: z.array(chatMessageSchema)
})
