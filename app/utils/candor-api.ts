export type UserRole = 'guest' | 'member'

export interface UserBrief {
  id: string
  role: UserRole
  email?: string | null
  display_name?: string | null
}

export interface UserMe {
  id: string
  role: UserRole
  email?: string | null
  display_name?: string | null
  created_at: string
}

export interface UserSession {
  token: string
  expires_in: number
  user: UserBrief
}

export interface GreetingOption {
  code: string
  label: string
}

export interface ConversationPackage {
  package_plan_code: string
  name_zh: string
  price: number
  confirmed: boolean
}

export interface PublicPackage {
  code: string
  name: string
  name_en?: string | null
  price: number
  period_days: number
  description?: string | null
}

export interface PackagePlansList {
  package_plans: PublicPackage[]
}

export interface PublicLabService {
  code: string
  name: string
  name_en?: string | null
  price: number
  description?: string | null
}

export interface LabServicesList {
  lab_services: PublicLabService[]
}

export interface RecommendationCopy {
  headline: string
  body: string
  disclaimer: string
}

export interface RecommendationItem {
  rank: number
  sellable_item_id: string
  sku?: string | null
  name?: string | null
  score_raw: number
  score_norm: number
  tier: string
  copy: RecommendationCopy
  copy_mode?: string
  warnings?: string[]
}

export interface RecommendationPackageItem {
  rank: number
  sellable_item_id: string
  code: string
  name?: string | null
  unit_price: number
  daily_dose: number
  monthly_cost: number
}

export interface RecommendationPackage {
  package_plan_code: string
  package_plan_name: string
  price: number
  period_days: number
  items: RecommendationPackageItem[]
  used_amount: number
  remaining: number
  composition_hash: string
}

export interface RecommendationResponse {
  run_id: string
  report_id?: string | null
  weight_set: { id: string, version: string }
  generated_at: string
  copy_mode: string
  summary: {
    top_domains: Array<{ domain_id: string, name?: string | null, severity: number }>
    data_gaps: string[]
    profile_gaps: string[]
    strategy_code: string
    message?: string | null
  }
  items: RecommendationItem[]
  packages: RecommendationPackage[]
  excluded?: Array<{ sellable_item_id: string, reason_code: string }> | null
}

export interface ConversationGreeting {
  message_id: string
  role: string
  content: string
  options: GreetingOption[]
  selected?: string[]
}

export interface ConversationCreate {
  id: string
  report_id?: string | null
  renewal_of_order_id?: string | null
  package_plan?: ConversationPackage | null
  greeting: ConversationGreeting
}

export interface ConversationAttachAck {
  id: string
  report_id: string
}

export interface ConversationGoalsResult {
  saved: boolean
  goals?: string[]
  diverted?: boolean
  needs_clarification?: boolean
  prompt?: string
  options?: GreetingOption[]
  selected?: string[]
}

export interface ConversationPackageConfirm {
  id: string
  package_plan: ConversationPackage
}

export type CandorPaymentMethod = 'card' | 'linepay' | 'atm'
export type CandorInvoiceType = 'cloud' | 'company' | 'donate'

export type OrderLineKind = 'package' | 'lab_service' | 'day_supply'

export interface OrderLineInput {
  kind: OrderLineKind
  package_plan_code?: string
  composition_hash?: string
  report_id?: string
  lab_service_code?: string
  sellable_item_code?: string
  days?: number
}

export interface OrderCreateRequest {
  lines: OrderLineInput[]
  payment_method: CandorPaymentMethod
  invoice_type: CandorInvoiceType
  invoice_carrier?: string
  recipient: {
    name: string
    phone: string
    address: string
    email?: string
  }
  conversation_id?: string
  recommendation_run_id?: string
  renewal_of_order_id?: string
  report_id?: string
}

export interface CandorPayment {
  id: string
  method: string
  status: string
  amount: number
  redirect_url?: string | null
}

export interface OrderCreated {
  id: string
  order_no: string
  status: string
  payment_status: string
  amount_total: number
  renewal_of_order_id?: string | null
  payment: CandorPayment
}

export interface OrderPaymentCreated {
  id: string
  order_no: string
  status: string
  payment_status: string
  payment: CandorPayment
}

export interface OrderSummary {
  id: string
  order_no: string
  status: string
  payment_status: string
  amount_total: number
  package_plan_name?: string | null
  period_end?: string | null
  created_at: string
}

export interface OrderPackageComponent {
  id: string
  sellable_item_id: string
  sellable_item_code: string
  sellable_item_name: string
  unit_price: number
  daily_dose: number
  monthly_cost: number
  rank: number
}

export interface OrderDetailPackage {
  id: string
  package_plan_code: string
  package_plan_name: string
  package_plan_price: number
  period_days: number
  composition_hash: string
  used_amount: number
  remaining: number
  components: OrderPackageComponent[]
}

export interface OrderDetail {
  id: string
  order_no: string
  status: string
  payment_status: string
  amount_total: number
  package_plan_name?: string | null
  package?: OrderDetailPackage | null
  lines: Array<Record<string, unknown>>
  recipient?: {
    name: string
    phone: string
    address: string
    email: string
  } | null
  invoice_type?: string | null
  created_at?: string
  payments?: CandorPayment[] | null
}

export interface OrderList {
  orders: OrderSummary[]
}

export interface OrderMessage {
  id: string
  role: string
  content: string
}

export interface OrderMessages {
  conversation_id: string
  messages: OrderMessage[]
}

export interface HealthReportUploadAck {
  id: string
  status: string
}

export interface HealthReportRetryAck {
  id: string
  status: string
  queued: boolean
}

export interface HealthReportResult {
  id: string
  biomarker_id?: string | null
  raw_name?: string | null
  raw_value?: string | null
  raw_unit?: string | null
  value_numeric?: number | null
  unit?: string | null
  ref_low?: number | null
  ref_high?: number | null
  borderline_low?: number | null
  borderline_high?: number | null
  critical_low?: number | null
  critical_high?: number | null
  confidence?: number | null
  needs_review?: boolean
  page?: number | null
}

export interface HealthReport {
  id: string
  status: string
  page_count?: number | null
  extraction_confidence?: number | null
  content_type?: string | null
  error?: string | null
  results?: HealthReportResult[] | null
}

export type ProfileAnswerType = 'enum' | 'int' | 'text' | 'multi_enum'

export interface ProfileNextDone {
  done: true
}

export interface ProfileNextQuestion {
  done: false
  gap_code: string
  prompt: string
  answer_type: ProfileAnswerType
  options?: GreetingOption[] | null
}

export type ProfileNext = ProfileNextDone | ProfileNextQuestion

export interface ProfileAnswerSaved {
  saved: true
  profile_gaps: string[]
}

export interface ProfileAnswerNeedsClarification {
  saved: false
  needs_clarification?: true
  diverted?: boolean
  prompt: string
  options?: GreetingOption[]
}

export type ProfileAnswerResult = ProfileAnswerSaved | ProfileAnswerNeedsClarification

export type ClaimGuardStatus = 'passed' | 'rewritten' | 'blocked'

export interface StreamMessageResult {
  message_id: string
  content: string
  claim_guard: ClaimGuardStatus
}

export interface ApiSuccess<T> {
  status: 'success'
  data: T
}

export interface ApiFailed {
  status: 'failed'
  error_message: string
  error_code: string
  error_data: unknown
}

export class CandorApiError extends Error {
  constructor(
    message: string,
    readonly statusCode: number,
    readonly errorCode: string,
    readonly errorData: unknown = null
  ) {
    super(message)
    this.name = 'CandorApiError'
  }
}

export const TOKEN_STORAGE_KEY = 'candor.guest.token'
