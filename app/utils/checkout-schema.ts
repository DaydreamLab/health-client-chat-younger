import { z } from 'zod'

export const paymentMethodSchema = z.enum(['card', 'linepay', 'atm'])
export const invoiceTypeSchema = z.enum(['member', 'cloud', 'company', 'donate'])
export const packagePlanCodeSchema = z.string().trim().min(1)

const cloudCarrier = z.string().trim().regex(/^\/[0-9A-Za-z.+-]{7}$/, 'invalid cloud carrier')
const companyCarrier = z.string().trim().regex(/^\d{8}$/, 'invalid company carrier')
const donateCarrier = z.string().trim().regex(/^\d{3,7}$/, 'invalid donate carrier')
const memberCarrier = z.string().trim().email('invalid member carrier')

export const checkoutSchema = z.object({
  name: z.string().trim().min(1),
  phone: z.string().trim().min(8),
  address: z.string().trim().min(1),
  paymentMethod: z.literal('card'),
  invoice: invoiceTypeSchema,
  invoiceCarrier: z.string().trim().min(1),
  packagePlanCode: packagePlanCodeSchema
}).superRefine((data, ctx) => {
  const carrier = data.invoiceCarrier
  if (data.invoice === 'cloud') {
    if (!cloudCarrier.safeParse(carrier).success) {
      ctx.addIssue({ code: 'custom', path: ['invoiceCarrier'], message: 'invalid cloud carrier' })
    }
  } else if (data.invoice === 'company') {
    if (!companyCarrier.safeParse(carrier).success) {
      ctx.addIssue({ code: 'custom', path: ['invoiceCarrier'], message: 'invalid company carrier' })
    }
  } else if (data.invoice === 'donate') {
    if (!donateCarrier.safeParse(carrier).success) {
      ctx.addIssue({ code: 'custom', path: ['invoiceCarrier'], message: 'invalid donate carrier' })
    }
  } else if (data.invoice === 'member') {
    if (!memberCarrier.safeParse(carrier).success) {
      ctx.addIssue({ code: 'custom', path: ['invoiceCarrier'], message: 'invalid member carrier' })
    }
  }
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
  invoiceCarrier: z.string().trim().min(1),
  recipient: recipientSchema,
  messages: z.array(chatMessageSchema)
})
