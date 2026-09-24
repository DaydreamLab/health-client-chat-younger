import type { OrderCreated, OrderDetail, OrderSummary } from './candor-api'

export type SupplementPlanId = 'basicCare' | 'fullTune'

export type SupplementItemId
  = 'vitaminD'
    | 'iron'
    | 'vitaminC'
    | 'omega3'
    | 'probiotic'
    | 'magnesium'

export type PaymentMethod = 'card' | 'linepay' | 'atm'
export type InvoiceType = 'member' | 'cloud' | 'company' | 'donate'
export type ShipmentStepId = 'confirmed' | 'picking' | 'shipped' | 'delivered'

export interface ChatPart {
  type: 'text' | 'file'
  text?: string
  name?: string
}

export interface ChatMessageOption {
  code: string
  label: string
}

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  parts: ChatPart[]
  options?: ChatMessageOption[]
  turnType?: 'profile' | 'message' | 'external'
  profileQuestion?: { gap_code: string, answer_type: string } | null
  profileGaps?: string[]
}

export interface SupplementItem {
  id: SupplementItemId
  swatch: string
  dailyDose: number
  dailyCost: number
  monthlyCost: number
  tier: 'core' | 'plus'
}

export interface SupplementPlan {
  id: SupplementPlanId
  price: number
  durationMonths: 1
  itemIds: SupplementItemId[]
}

export interface LabChartRow {
  key: string
  yours: number
  ref: number
}

export interface ReportAnalysis {
  score: number
  abnormalCount: number
  watchCount: number
  summary: string
  chart: LabChartRow[]
}

export interface OrderRecipient {
  name: string
  phone: string
  address: string
  email: string
}

export interface ShipmentStep {
  id: ShipmentStepId
  at: string | null
}

export interface OrderRecord {
  id: string
  number: string
  createdAt: string
  packagePlanCode: string
  packageName?: string
  amount: number
  productCodes: string[]
  productNames?: string[]
  paymentMethod: PaymentMethod
  paymentStatus?: string
  orderStatus?: string
  delivery: 'home'
  recipient: OrderRecipient
  invoice: InvoiceType
  messages: ChatMessage[]
  timeline: ShipmentStep[]
}

export interface CreateOrderInput {
  packagePlanCode: string
  packageName?: string
  amount?: number
  productCodes?: string[]
  productNames?: string[]
  paymentMethod: PaymentMethod
  invoice: InvoiceType
  invoiceCarrier: string
  recipient: OrderRecipient
  messages: ChatMessage[]
  compositionHash?: string
  reportId?: string | null
  conversationId?: string | null
  recommendationRunId?: string | null
}

export const supplementItems: Record<SupplementItemId, SupplementItem> = {
  vitaminD: {
    id: 'vitaminD',
    swatch: '#8B7FC7',
    dailyDose: 1,
    dailyCost: 9,
    monthlyCost: 280,
    tier: 'core'
  },
  iron: {
    id: 'iron',
    swatch: '#67D665',
    dailyDose: 1,
    dailyCost: 17,
    monthlyCost: 520,
    tier: 'core'
  },
  vitaminC: {
    id: 'vitaminC',
    swatch: '#5B9BD5',
    dailyDose: 1,
    dailyCost: 16,
    monthlyCost: 480,
    tier: 'core'
  },
  omega3: {
    id: 'omega3',
    swatch: '#D9A441',
    dailyDose: 1,
    dailyCost: 9,
    monthlyCost: 280,
    tier: 'plus'
  },
  probiotic: {
    id: 'probiotic',
    swatch: '#8B7FC7',
    dailyDose: 1,
    dailyCost: 7,
    monthlyCost: 220,
    tier: 'plus'
  },
  magnesium: {
    id: 'magnesium',
    swatch: '#F6C16B',
    dailyDose: 1,
    dailyCost: 7,
    monthlyCost: 200,
    tier: 'plus'
  }
}

export const supplementPlans: Record<SupplementPlanId, SupplementPlan> = {
  basicCare: {
    id: 'basicCare',
    price: 1280,
    durationMonths: 1,
    itemIds: ['vitaminD', 'iron', 'vitaminC']
  },
  fullTune: {
    id: 'fullTune',
    price: 1980,
    durationMonths: 1,
    itemIds: ['vitaminD', 'iron', 'vitaminC', 'omega3', 'probiotic', 'magnesium']
  }
}

export const supplementPlanIds: SupplementPlanId[] = ['basicCare', 'fullTune']

export const labChartRows: LabChartRow[] = [
  { key: 'vitaminD', yours: 28, ref: 45 },
  { key: 'ferritin', yours: 42, ref: 100 },
  { key: 'homa', yours: 2.8, ref: 1.4 },
  { key: 'dheas', yours: 246, ref: 300 },
  { key: 'hba1c', yours: 5.4, ref: 5.6 },
  { key: 'ldl', yours: 98, ref: 100 }
]

export const shipmentStepIds: ShipmentStepId[] = [
  'confirmed',
  'picking',
  'shipped',
  'delivered'
]

export function isSupplementPlanId(value: unknown): value is SupplementPlanId {
  return value === 'basicCare' || value === 'fullTune'
}

export function itemsForPlan(planId: SupplementPlanId): SupplementItem[] {
  return supplementPlans[planId].itemIds.map(id => supplementItems[id])
}

export function formatTwd(amount: number) {
  return `NT$${amount.toLocaleString('zh-TW')}`
}

export function formatOrderNumber(date = new Date()) {
  const stamp = [
    String(date.getFullYear()).slice(2),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
    String(date.getHours()).padStart(2, '0'),
    String(date.getMinutes()).padStart(2, '0'),
    String(date.getSeconds()).padStart(2, '0')
  ].join('')

  return stamp
}

export function timelineStatus(timeline: ShipmentStep[]): ShipmentStepId {
  const reached = [...timeline].reverse().find(step => step.at)
  return reached?.id ?? 'confirmed'
}

export function mockReportSummary(locale?: string) {
  if (locale === 'en') {
    return 'I read your labs. Vitamin D and ferritin are low; HOMA-IR is a bit high. Open the chart and pick a one-month plan — Basic Care or Full Tune.'
  }

  return '已讀到你的血檢。維他命 D 與鐵蛋白偏低，HOMA-IR 略高。可以看圖表，並選擇一個月的基礎保養或完整調理。'
}

export function mockReportAnalysis(locale?: string): ReportAnalysis {
  return {
    score: 66,
    abnormalCount: 4,
    watchCount: 3,
    summary: mockReportSummary(locale),
    chart: labChartRows
  }
}

export function mockCatalog() {
  return {
    items: Object.values(supplementItems),
    plans: Object.values(supplementPlans),
    chart: labChartRows
  }
}

export function mockCreateOrder(input: CreateOrderInput): OrderRecord {
  const now = new Date()
  const packagePlanCode = input.packagePlanCode || 'basic'
  const knownPlan = isSupplementPlanId(packagePlanCode) ? supplementPlans[packagePlanCode] : null
  const amount = input.amount ?? knownPlan?.price ?? 0
  const productCodes = input.productCodes ?? (knownPlan ? [...knownPlan.itemIds] : [])

  return {
    id: crypto.randomUUID(),
    number: formatOrderNumber(now),
    createdAt: now.toISOString(),
    packagePlanCode,
    packageName: input.packageName,
    amount,
    productCodes,
    productNames: input.productNames ? [...input.productNames] : undefined,
    paymentMethod: input.paymentMethod,
    paymentStatus: 'paid',
    orderStatus: 'confirmed',
    delivery: 'home',
    recipient: input.recipient,
    invoice: input.invoice,
    messages: input.messages.map(message => ({
      ...message,
      parts: message.parts.map(part => ({ ...part }))
    })),
    timeline: [
      { id: 'confirmed', at: now.toISOString() },
      { id: 'picking', at: null },
      { id: 'shipped', at: null },
      { id: 'delivered', at: null }
    ]
  }
}

export function shouldPersistChat(input: { paid: boolean }) {
  return input.paid
}

function defaultShipmentTimeline(confirmedAt: string): ShipmentStep[] {
  return [
    { id: 'confirmed', at: confirmedAt },
    { id: 'picking', at: null },
    { id: 'shipped', at: null },
    { id: 'delivered', at: null }
  ]
}

function cloneMessages(messages: ChatMessage[]): ChatMessage[] {
  return messages.map(message => ({
    ...message,
    parts: message.parts.map(part => ({ ...part }))
  }))
}

export function orderRecordFromCandorCreated(
  created: OrderCreated,
  input: CreateOrderInput
): OrderRecord {
  const createdAt = new Date().toISOString()
  const confirmedAt = created.status === 'confirmed' ? createdAt : null
  return {
    id: created.id,
    number: created.order_no,
    createdAt,
    packagePlanCode: input.packagePlanCode,
    packageName: input.packageName,
    amount: created.amount_total,
    productCodes: input.productCodes ? [...input.productCodes] : [],
    productNames: input.productNames ? [...input.productNames] : undefined,
    paymentMethod: input.paymentMethod,
    paymentStatus: created.payment_status,
    orderStatus: created.status,
    delivery: 'home',
    recipient: { ...input.recipient },
    invoice: input.invoice,
    messages: cloneMessages(input.messages),
    timeline: confirmedAt
      ? defaultShipmentTimeline(confirmedAt)
      : [
          { id: 'confirmed', at: null },
          { id: 'picking', at: null },
          { id: 'shipped', at: null },
          { id: 'delivered', at: null }
        ]
  }
}

export function orderRecordFromCandorDetail(
  detail: OrderDetail,
  fallback: Partial<CreateOrderInput> = {}
): OrderRecord {
  const components = detail.package?.components ?? []
  const productCodes = components.map(item => item.sellable_item_code)
  const productNames = components.map(item => item.sellable_item_name)
  const createdAt = detail.created_at ?? new Date().toISOString()
  const recipient = detail.recipient ?? fallback.recipient ?? {
    name: '',
    phone: '',
    address: '',
    email: ''
  }
  const invoiceRaw = detail.invoice_type ?? fallback.invoice ?? 'member'
  const invoice: InvoiceType = invoiceRaw === 'company' || invoiceRaw === 'donate' || invoiceRaw === 'cloud' || invoiceRaw === 'member'
    ? invoiceRaw
    : 'member'
  const confirmedAt = detail.status === 'confirmed' || detail.status === 'shipped' || detail.status === 'delivered'
    ? (detail.confirmed_at ?? createdAt)
    : null

  return {
    id: detail.id,
    number: detail.order_no,
    createdAt,
    packagePlanCode: detail.package?.package_plan_code ?? fallback.packagePlanCode ?? '',
    packageName: detail.package_plan_name ?? detail.package?.package_plan_name ?? fallback.packageName,
    amount: detail.amount_total,
    productCodes: productCodes.length ? productCodes : (fallback.productCodes ?? []),
    productNames: productNames.length ? productNames : fallback.productNames,
    paymentMethod: fallback.paymentMethod ?? 'card',
    paymentStatus: detail.payment_status,
    orderStatus: detail.status,
    delivery: 'home',
    recipient,
    invoice,
    messages: fallback.messages ? cloneMessages(fallback.messages) : [],
    timeline: confirmedAt
      ? defaultShipmentTimeline(confirmedAt)
      : [
          { id: 'confirmed', at: null },
          { id: 'picking', at: null },
          { id: 'shipped', at: null },
          { id: 'delivered', at: null }
        ]
  }
}

export function orderRecordFromCandorSummary(summary: OrderSummary): OrderRecord {
  const confirmedAt = summary.status === 'confirmed' || summary.status === 'shipped' || summary.status === 'delivered'
    ? summary.created_at
    : null
  return {
    id: summary.id,
    number: summary.order_no,
    createdAt: summary.created_at,
    packagePlanCode: '',
    packageName: summary.package_plan_name ?? undefined,
    amount: summary.amount_total,
    productCodes: [],
    paymentMethod: 'card',
    paymentStatus: summary.payment_status,
    orderStatus: summary.status,
    delivery: 'home',
    recipient: { name: '', phone: '', address: '', email: '' },
    invoice: 'member',
    messages: [],
    timeline: confirmedAt
      ? defaultShipmentTimeline(confirmedAt)
      : [
          { id: 'confirmed', at: null },
          { id: 'picking', at: null },
          { id: 'shipped', at: null },
          { id: 'delivered', at: null }
        ]
  }
}
