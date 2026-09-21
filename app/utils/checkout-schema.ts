import { z } from 'zod'

export const checkoutSchema = z.object({
  name: z.string().trim().min(1),
  phone: z.string().trim().min(8),
  address: z.string().trim().min(1),
  paymentMethod: z.enum(['card', 'linepay', 'atm']),
  invoice: z.enum(['cloud', 'company', 'donate']),
  planId: z.enum(['basicCare', 'fullTune'])
})
