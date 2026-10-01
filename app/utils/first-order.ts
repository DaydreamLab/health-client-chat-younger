import type { OrderCreated, OrderDetail, OrderSummary } from './candor-api'

/** Demo catalog codes (not live API identifiers). */
export type DemoPackagePlanId = 'basic' | 'advance'

export type DemoSellableItemId
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
  /** Assistant invited upload; show in-bubble upload button. */
  uploadOffer?: boolean
  /** Status note (report progress / ready). Does not replace the active question. */
  notice?: boolean
}

export function chatMessageText(message: { parts: Array<{ type: string, text?: string }> }): string {
  return message.parts
    .filter(part => part.type === 'text')
    .map(part => part.text ?? '')
    .join('\n')
}

/** Open clarifying question, not a wrap-up. */
export function assistantStillAsking(text: string): boolean {
  return /[?？]/.test(text)
}

/**
 * The goal a clarifying question is actually about.
 * A greeting that lists every direction is not a question, so it does not count.
 */
export function focusedClarifyingGoal(text: string, labels: string[]): string | null {
  if (!assistantStillAsking(text)) {
    return null
  }
  let best: { label: string, index: number } | null = null
  for (const label of labels) {
    const index = text.lastIndexOf(label)
    if (index >= 0 && (best === null || index > best.index)) {
      best = { label, index }
    }
  }
  return best?.label ?? null
}

/**
 * Two or more selected goals stay open until each has been asked and answered.
 * The goal-selection message itself does not count.
 */
export function goalsClarificationOpen(
  messages: Array<{ role: string, parts: Array<{ type: string, text?: string }> }>,
  goalLabels: string[]
): boolean {
  const labels = [...new Set(goalLabels.map(label => label.trim()).filter(label => label !== ''))]
  if (labels.length === 0) {
    return false
  }
  const covered = new Set<string>()
  messages.forEach((message, index) => {
    if (message.role !== 'assistant') {
      return
    }
    const focus = focusedClarifyingGoal(chatMessageText(message), labels)
    if (!focus) {
      return
    }
    const answered = messages.slice(index + 1).some(later => later.role === 'user')
    if (answered) {
      covered.add(focus)
    }
  })
  if (labels.some(label => !covered.has(label))) {
    return true
  }
  const lastAssistant = [...messages].reverse().find(message => message.role === 'assistant')
  return lastAssistant !== undefined && assistantStillAsking(chatMessageText(lastAssistant))
}

/** Chip confirm sends labels joined in one user message, e.g. 「體態管理、皮膚氣色」. */
export function inferClarifyingGoalLabels(
  messages: Array<{ role: string, parts: Array<{ type: string, text?: string }> }>,
  options: Array<{ label: string }>
): string[] {
  const labels = options.map(option => option.label).filter(label => label !== '')
  for (const message of messages) {
    if (message.role !== 'user') {
      continue
    }
    const text = chatMessageText(message)
    const hit = labels.filter(label => text.includes(label))
    if (hit.length >= 2) {
      return hit
    }
  }
  return []
}

/** Assistant asked the user to upload, or asked whether they already have a report to upload. */
export function messageOffersUpload(text: string): boolean {
  if (/upload report/i.test(text)) {
    return true
  }
  return text.includes('上傳') && /報告|檢驗/.test(text)
}

/**
 * 「查看推薦方案」出現在最新一則助理訊息上。
 * 還在選改善方向，或這則本身仍是 profile 題庫題時先不顯示。
 * 兩個改善方向的後續釐清不擋這個按鈕。
 */
export function recommendCtaVisible(input: {
  readonlyMode: boolean
  escalated: boolean
  goalSelectActive: boolean
  profileQuestionActive: boolean
  isLatestAssistant: boolean
  reportRetry: boolean
}): boolean {
  return !input.readonlyMode
    && !input.escalated
    && !input.goalSelectActive
    && !input.profileQuestionActive
    && input.isLatestAssistant
    && !input.reportRetry
}

/** Drop the client-appended「問答已完成」guide while clarification is still open. */
export function stripFinishedQuizGuide(text: string): string {
  const kept = text.split('\n').filter((line) => {
    const trimmed = line.trim()
    return !trimmed.startsWith('問答已完成')
      && !trimmed.startsWith('問答與報告都就緒')
      && !trimmed.startsWith('Questions done.')
      && !trimmed.startsWith('Questions and report are ready.')
  })
  return kept.join('\n').replace(/\n{3,}/g, '\n\n').trim()
}

/** Persistable clone for journey localStorage (keeps uploadOffer). */
export function snapshotChatMessage(message: ChatMessage): ChatMessage {
  return {
    id: message.id,
    role: message.role,
    parts: message.parts.map(part => ({ ...part })),
    options: message.options ? message.options.map(option => ({ ...option })) : undefined,
    turnType: message.turnType,
    profileQuestion: message.profileQuestion ? { ...message.profileQuestion } : message.profileQuestion,
    profileGaps: message.profileGaps ? [...message.profileGaps] : undefined,
    ...(message.uploadOffer ? { uploadOffer: true } : {}),
    ...(message.notice ? { notice: true } : {})
  }
}

export interface DemoSellableItem {
  id: DemoSellableItemId
  swatch: string
  dailyDose: number
  dailyCost: number
  monthlyCost: number
  tier: 'core' | 'plus'
}

export interface DemoPackagePlan {
  id: DemoPackagePlanId
  price: number
  durationMonths: 1
  itemIds: DemoSellableItemId[]
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

export interface OrderItemLine {
  code: string
  name: string
  dailyDose: number
  monthlyCost?: number
  imageUrl?: string | null
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
  items: OrderItemLine[]
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

export const demoSellableItems: Record<DemoSellableItemId, DemoSellableItem> = {
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

export const demoPackagePlans: Record<DemoPackagePlanId, DemoPackagePlan> = {
  basic: {
    id: 'basic',
    price: 1280,
    durationMonths: 1,
    itemIds: ['vitaminD', 'iron', 'vitaminC']
  },
  advance: {
    id: 'advance',
    price: 1980,
    durationMonths: 1,
    itemIds: ['vitaminD', 'iron', 'vitaminC', 'omega3', 'probiotic', 'magnesium']
  }
}

export const demoPackagePlanIds: DemoPackagePlanId[] = ['basic', 'advance']

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

export function isDemoPackagePlanId(value: unknown): value is DemoPackagePlanId {
  return value === 'basic' || value === 'advance'
}

export function itemsForPackagePlan(planId: DemoPackagePlanId): DemoSellableItem[] {
  return demoPackagePlans[planId].itemIds.map(id => demoSellableItems[id])
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

export function demoReportSummary(locale?: string) {
  if (locale === 'en') {
    return 'I read your labs. Vitamin D and ferritin are low; HOMA-IR is a bit high. Open the chart and pick a one-month plan.'
  }

  return '已讀到你的血檢。維他命 D 與鐵蛋白偏低，HOMA-IR 略高。可以看圖表，並選擇一個月方案。'
}

/** @deprecated use demoReportSummary */
export const mockReportSummary = demoReportSummary

function itemsFromParts(
  codes: string[],
  names: string[] | undefined,
  doses: number[] = []
): OrderItemLine[] {
  return codes.map((code, index) => ({
    code,
    name: names?.[index] || code,
    dailyDose: doses[index] ?? 1
  }))
}

/** Test helper: build a local order record without calling Nitro or core. */
export function buildDemoOrder(input: CreateOrderInput): OrderRecord {
  const now = new Date()
  const packagePlanCode = input.packagePlanCode || 'basic'
  const knownPlan = isDemoPackagePlanId(packagePlanCode) ? demoPackagePlans[packagePlanCode] : null
  const amount = input.amount ?? knownPlan?.price ?? 0
  const productCodes = input.productCodes ?? (knownPlan ? [...knownPlan.itemIds] : [])
  const productNames = input.productNames ? [...input.productNames] : undefined
  const items = itemsFromParts(
    productCodes,
    productNames,
    productCodes.map((code) => {
      if (Object.prototype.hasOwnProperty.call(demoSellableItems, code)) {
        return demoSellableItems[code as DemoSellableItemId].dailyDose
      }
      return 1
    })
  )

  return {
    id: crypto.randomUUID(),
    number: formatOrderNumber(now),
    createdAt: now.toISOString(),
    packagePlanCode,
    packageName: input.packageName,
    amount,
    productCodes,
    productNames,
    items,
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
  const productCodes = input.productCodes ? [...input.productCodes] : []
  const productNames = input.productNames ? [...input.productNames] : undefined
  return {
    id: created.id,
    number: created.order_no,
    createdAt,
    packagePlanCode: input.packagePlanCode,
    packageName: input.packageName,
    amount: created.amount_total,
    productCodes,
    productNames,
    items: itemsFromParts(productCodes, productNames),
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
  const productCodes = components.length
    ? components.map(item => item.sellable_item_code)
    : (fallback.productCodes ?? [])
  const productNames = components.length
    ? components.map(item => item.sellable_item_name)
    : fallback.productNames
  const items: OrderItemLine[] = components.length
    ? components.map(item => ({
        code: item.sellable_item_code,
        name: item.sellable_item_name,
        dailyDose: item.daily_dose,
        monthlyCost: item.monthly_cost,
        imageUrl: item.image_url ?? null
      }))
    : itemsFromParts(productCodes, productNames)
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
    productCodes,
    productNames,
    items,
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
    items: [],
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
