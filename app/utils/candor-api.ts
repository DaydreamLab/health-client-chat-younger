import type { ReplyActions } from './reply-actions'

export type UserRole = 'guest' | 'member'

export interface UserBrief {
  id: string
  role: UserRole
  email?: string | null
  display_name?: string | null
}

export interface DefaultRecipient {
  name: string | null
  phone: string | null
  address_city: string | null
  address_district: string | null
  address_detail: string | null
}

export interface UserMe {
  id: string
  role: UserRole
  email?: string | null
  display_name?: string | null
  created_at: string
  default_recipient?: DefaultRecipient | null
}

export interface UserSession {
  token: string
  expires_in: number
  user: UserBrief
}

export interface GreetingOption {
  code: string
  label: string
  label_en?: string
  /** When set (lab_followup), click routes to upload / checkup — not profile answers. */
  maps_to?: string | null
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
  description_en?: string | null
  original_price?: number | null
  features?: string[] | null
  features_en?: string[] | null
  badge?: string | null
  badge_en?: string | null
  highlight?: boolean | null
  pack_capacity?: number
  core_count?: number
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

export interface ClientConfig {
  individual_tests_url: string
  items?: Array<{ key: string, url: string }>
  payment_methods?: Array<'card' | 'linepay' | 'atm'>
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
  image_url?: string | null
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
  daily_servings_max?: number | null
  daily_price?: number | null
  monthly_cost: number
  score_raw?: number | null
  /** 是否基礎（核心）品；來自主檔，false／缺省視為功能型 */
  is_core?: boolean
  image_url?: string | null
  /** Expert-review revised snapshot may mark removed lines. */
  removed?: boolean
  stored_reason?: string | null
  display_reason?: string | null
  display_reason_source?: 'retrieved' | 'stored' | 'engine' | 'personal_risk' | string
}

export interface ClaimGuardHit {
  term: string
  severity: 'blocked' | 'rewritten' | string
}

export interface PackageRationaleEntry {
  code: string
  name: string
  ingredient_label: string
  line: string
  /** Present for zero-contribution core admission items; e.g. 「對應免疫提升」. */
  help_label?: string | null
  claim_guard_hits: ClaimGuardHit[]
}

export interface PackageRationaleGroup {
  kind: 'goal' | 'signal' | 'foundation' | string
  key: string
  title: string
  entries: PackageRationaleEntry[]
}

export interface PackageRationaleItem {
  code: string
  name: string
  reason: string
  claim_guard_hits: ClaimGuardHit[]
}

/** Overview card above package contents; from POST /recommendations. */
export interface PackageRationale {
  headline: string
  body: string
  disclaimer: string
  copy_mode: 'llm' | 'template' | string
  groups: PackageRationaleGroup[]
  items: PackageRationaleItem[]
  claim_guard_hits: ClaimGuardHit[]
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
  rationale?: PackageRationale | null
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

export type RefundRequestStatus = 'requested' | 'refunded' | 'rejected'

/** `offer_recommend` completion CTA payload (spec 33 / core #143). */
export interface OfferRecommendPayload {
  mode: 'view_recommendations'
  label: string
  path: string
}

/** Public expert_plans catalog row (spec 33). */
export interface ExpertPlan {
  id: string
  code: string
  package_plan_id: string
  package_plan_code?: string | null
  package_plan_name_zh?: string | null
  name_zh: string
  name_en?: string | null
  /** Opening amount TWD integer. */
  price: number
  active?: boolean
  /** Checkout list order (asc). */
  sort_order?: number
}

export interface ExpertPlanList {
  expert_plans: ExpertPlan[]
}

/** POST /conversations/{id}/completion-choice — first press time only. */
export interface CompletionChoiceAck {
  conversation_id: string
  chosen_at: string
}

export interface ConversationCompletionChoice {
  chosen_at: string
}

export type CheckoutPreviewMode = 'ai' | 'expert'

export type CheckoutPreviewBlockCode = 'expert_case_exists' | 'no_expert_plans'

export interface CheckoutPreviewBlock {
  code: CheckoutPreviewBlockCode
  message_key?: string | null
}

export type CheckoutLockReason = 'order_submitted' | 'case_finalized'

export interface CheckoutPreviewShipping {
  fee: number
  free: boolean
}

export type CheckoutPaymentMethodCode = CandorPaymentMethod

export interface CheckoutPreviewPaymentMethod {
  code: CheckoutPaymentMethodCode
  available: boolean
  status: 'coming_soon' | null
}

/** mode=ai package preview; same composition source as POST /recommendations. */
export interface CheckoutPreviewAiPackage {
  package_plan_code: string
  package_plan_name: string
  name_zh: string
  price: number
  period_days: number
  item_count: number
  used_amount?: number
  remaining?: number
  composition_hash?: string
  items: RecommendationPackageItem[]
}

export interface CheckoutPreview {
  conversation_id: string
  mode: CheckoutPreviewMode
  block: CheckoutPreviewBlock | null
  checkout_locked: boolean
  checkout_lock_reason?: CheckoutLockReason | null
  recipient?: Record<string, unknown> | null
  shipping: CheckoutPreviewShipping
  invoice?: Record<string, unknown> | null
  payment_methods: CheckoutPreviewPaymentMethod[]
  expert_plans: ExpertPlan[]
  preselect_expert_plan_code?: string | null
  ai: CheckoutPreviewAiPackage | null
  completion_choice?: ConversationCompletionChoice | null
  /**
   * core #146 unpaid／pending／failed／expired reuse on 200 preview (`mode=expert`).
   * May include `expert_plan_code`／`payment_status`; `mode=ai` fixed `null`.
   * FE: with `order_id` → gate to order repay; typed so extra fields never break.
   */
  existing_order?: {
    order_id?: string
    order_no?: string
    expert_plan_code?: string
    payment_status?: string
    [key: string]: unknown
  } | null
}

export interface FinalizedPlanItem {
  sellable_item_code?: string | null
  name_zh?: string | null
  daily_dose?: number | null
  unit?: string | null
}

export interface FinalizedPlanPackage {
  package_plan_code?: string | null
  name_zh?: string | null
  items: FinalizedPlanItem[]
}

export interface FinalizedPlan {
  order_id: string
  expert_case_id: string
  reviewed_at?: string | null
  packages: FinalizedPlanPackage[]
}

export type RefundBlockedReason
  = 'not_yet_reviewed'
    | 'picking_started'
    | 'already_shipped'
    | 'refund_rejected'
    | 'refund_request_exists'

/** Member expert-case-review status / reviewed packages (spec 32／33). */
export interface ExpertCaseReviewStatus {
  id: string
  conversation_id: string
  health_report_id?: string | null
  status: 'awaiting_review' | 'reviewed'
  recommendation_run_id: string
  created_at: string
  updated_at?: string | null
  reviewed_at?: string | null
  packages?: RecommendationPackage[]
  summary?: RecommendationResponse['summary'] | null
  weight_set?: { id: string, version?: string } | null
  /** Paid expert_plan case — null for legacy free cases (spec 33). */
  order_id?: string | null
  expert_plan_id?: string | null
  refund_request_status?: RefundRequestStatus | null
  refund_status?: RefundRequestStatus | null
  /** Only when status=requested: core copy「退款申請中」. */
  refund_request_display?: string | null
  refund_blocked_reason?: RefundBlockedReason | null
  refund_rejection_reason?: string | null
  completion_choice?: ConversationCompletionChoice | null
  /** @deprecated Prefer refund_blocked_reason === null on orders. */
  can_request_refund?: boolean | null
}

/** Member list row — never includes packages (GET /expert-case-reviews). */
export interface ExpertCaseReviewListItem {
  id: string
  conversation_id: string
  health_report_id?: string | null
  status: 'awaiting_review' | 'reviewed'
  created_at: string
  updated_at?: string | null
  reviewed_at?: string | null
  order_id?: string | null
  expert_plan_id?: string | null
  refund_request_status?: RefundRequestStatus | null
  refund_status?: RefundRequestStatus | null
  refund_request_display?: string | null
  refund_blocked_reason?: RefundBlockedReason | null
  refund_rejection_reason?: string | null
}

export interface ExpertCaseReviewList {
  expert_case_reviews: ExpertCaseReviewListItem[]
}

export interface ConversationGreeting {
  message_id: string
  role: string
  content: string
  options: GreetingOption[]
  options_kind?: 'consultation_goals' | null
  selected?: string[]
  /** Not used on greeting; upload CTA comes after lab_report within_1y/within_6m. */
  upload_offer?: boolean
  plan_offer?: boolean
  reply_actions?: ReplyActions | null
}

export interface ConversationCreate {
  id: string
  report_id?: string | null
  renewal_of_order_id?: string | null
  package_plan?: ConversationPackage | null
  greeting: ConversationGreeting
  /** Path C 第二則流程提示（上傳引導或「報告收到了…」）。 */
  flow_prompt?: ConversationGreeting | null
  /** Journey path from core (`a`／`b`／`c`). FE normalizes to A／B／C. */
  path?: 'a' | 'b' | 'c' | 'A' | 'B' | 'C' | null
}

/**
 * POST /conversation/{id}/path body.
 * Prefer lowercase `a|b|c` to match core; uppercase still accepted by core.
 */
export interface ConversationPathUpdate {
  path: 'a' | 'b' | 'c' | 'A' | 'B' | 'C'
  /** Optional reason for audit (entry｜upload_promote｜cancel_demote｜guide_switch). */
  reason?: string | null
}

export interface ConversationPathAck {
  id: string
  path: 'a' | 'b' | 'c' | 'A' | 'B' | 'C'
  report_id?: string | null
  /**
   * Entry C without report, or Path B opening／A→B guide (core #133／#140):
   * flow turn with `reply_actions` (same shape as create.flow_prompt).
   */
  flow_prompt?: ConversationGreeting | null
}

export interface ConversationAttachAck {
  id: string
  report_id: string
  path?: 'a' | 'b' | 'c' | 'A' | 'B' | 'C' | null
  flow_prompt?: ConversationGreeting | null
}

export interface ContinueHealthConsultationAck {
  id: string
  continue_health_consultation: boolean
}

export interface ConversationDetachAck {
  id: string
  report_id: null
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
  checkup_offer?: boolean
  checkup_suggest?: string | null
  checkup_offer_label?: string | null
  individual_tests_url?: string | null
}

export type ProfileNext = ProfileNextDone | ProfileNextQuestion

export interface ConversationGoalsResult {
  saved: boolean
  goals?: string[]
  diverted?: boolean
  needs_clarification?: boolean
  prompt?: string
  options?: GreetingOption[]
  options_kind?: 'consultation_goals' | null
  selected?: string[]
  next_question?: ProfileNext
  checkup_offer?: boolean
  checkup_suggest?: string | null
  checkup_offer_label?: string | null
  individual_tests_url?: string | null
}

export interface ConversationPackageConfirm {
  id: string
  package_plan: ConversationPackage
}

export type CandorPaymentMethod = 'card' | 'linepay' | 'atm'
export type CandorInvoiceType = 'member' | 'cloud' | 'company' | 'donate'

export type OrderLineKind = 'package' | 'lab_service' | 'day_supply' | 'expert_plan'

export interface OrderLineInput {
  kind: OrderLineKind
  package_plan_code?: string
  composition_hash?: string
  report_id?: string
  lab_service_code?: string
  sellable_item_code?: string
  days?: number
  /** Spec 33 — expert_plan line (mutually exclusive with package／lab／day_supply). */
  expert_plan_code?: string
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
  /**
   * Expert-plan display name when core backfills it on list/detail summary.
   * Absent on older payloads; null when the order is not expert or lookup failed.
   */
  expert_plan_name?: string | null
  /** Optional lines when list payload includes them (safe to omit). */
  lines?: Array<Record<string, unknown>> | null
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
  is_core?: boolean
  image_url?: string | null
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
  /**
   * Top-level expert plan name (core may backfill from expert_plan_id).
   * Prefer lines[].expert_plan_name when present.
   */
  expert_plan_name?: string | null
  package?: OrderDetailPackage | null
  lines: Array<Record<string, unknown>>
  recipient?: {
    name: string
    phone: string
    address: string
    email: string
  } | null
  invoice_type?: string | null
  invoice_status?: string | null
  invoice_number?: string | null
  created_at?: string
  confirmed_at?: string | null
  payments?: CandorPayment[] | null
  conversation_id?: string | null
  /** Spec 33 — member refund-request fields. */
  refund_request_status?: RefundRequestStatus | null
  refund_status?: RefundRequestStatus | null
  /** Only when status=requested: core copy「退款申請中」. */
  refund_request_display?: string | null
  refund_blocked_reason?: RefundBlockedReason | null
  refund_rejection_reason?: string | null
  completion_choice?: ConversationCompletionChoice | null
  /** Shipment status when present (`picking`｜`shipped`｜…). */
  shipment_status?: string | null
  shipment?: { status?: string | null } | null
  expert_case_id?: string | null
  expert_case_status?: 'awaiting_review' | 'reviewed' | null
  expert_case_phase?: 'processing' | 'finalized' | null
  expert_case_review?: {
    id?: string
    status?: 'awaiting_review' | 'reviewed' | null
    conversation_id?: string | null
  } | null
  /** @deprecated Use refund_rejection_reason. */
  refund_reject_reason?: string | null
}

export interface RefundRequestCreated {
  id?: string
  order_id?: string
  status?: RefundRequestStatus
  refund_request_status?: RefundRequestStatus
  refund_status?: RefundRequestStatus
  refund_request_display?: string | null
}

export interface OrderList {
  orders: OrderSummary[]
}

export interface OrderMessage {
  id: string
  role: string
  content: string
  /** Optional when order transcript carries semantic CTAs (same schema as chat history). */
  reply_actions?: ReplyActions | null
}

export interface OrderMessages {
  conversation_id: string
  messages: OrderMessage[]
}

/**
 * GET /conversation/{id}/messages — history rows (core reply_actions v0.1).
 * Field set mirrors SSE `done` meta so FE can reuse CTA projection.
 */
export interface ConversationHistoryMessageDto {
  id?: string
  message_id?: string
  role: string
  content?: string
  text?: string
  options?: GreetingOption[]
  options_kind?: 'consultation_goals' | null
  turn?: ChatTurnMeta | null
  profile_question?: ChatProfileQuestion | null
  profile_gaps?: string[]
  upload_offer?: boolean
  checkup_offer?: boolean
  checkup_suggest?: string | null
  checkup_offer_label?: string | null
  individual_tests_url?: string | null
  reply_actions?: ReplyActions | null
}

export interface ConversationMessages {
  conversation_id?: string
  /** Journey path when core includes it on history payload (optional). */
  path?: 'a' | 'b' | 'c' | 'A' | 'B' | 'C' | null
  messages: ConversationHistoryMessageDto[]
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
  /** Display Chinese name from core (extract → dictionary → AI → raw). */
  name_zh?: string | null
  name_zh_source?: 'report' | 'ai' | 'dictionary' | 'raw' | null
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
  /** Versus ref_low/ref_high only; present when core enriches the report. */
  range_status?: 'low' | 'high' | 'normal' | 'unknown' | null
  /** Out-of-range copy only; omit when empty. */
  description?: string | null
  possible_causes?: string | null
  possible_risks?: string | null
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

export interface HealthReportSummary {
  id: string
  status: string
  created_at: string
  content_type?: string | null
  page_count?: number | null
  error?: string | null
}

export interface HealthReportList {
  reports: HealthReportSummary[]
  /** Member report count for paging (GET /health-reports). */
  total: number
}

export interface UserHealthProfile {
  sex: string | null
  age_years: number | null
  height_cm: number | null
  weight_kg: number | null
  diet: string | null
  goals: string[]
}

export interface HealthReportPatchResultRequest {
  value_numeric?: number | null
  unit?: string | null
  biomarker_id?: string | null
  confirm?: boolean | null
}

export interface RenewalDueItem {
  order_id: string
  order_no: string
  package_code: string
  package_name: string
  period_end: string
  days_left: number
  expired: boolean
}

export interface RenewalsDueList {
  renewals: RenewalDueItem[]
}

/** Member inbox row (GET /notifications). Guest → 403 `member_required`. */
export type InboxNotificationType = 'member_registered' | 'expert_review_completed'

export interface InboxNotification {
  id: string
  /** Domain event key; some payloads may use `event` instead — client maps both. */
  type: InboxNotificationType | string
  title: string
  body: string
  created_at: string
  read_at: string | null
  /** App path such as `/app` or `/app/me`. */
  deep_link: string
}

export interface InboxNotificationList {
  notifications: InboxNotification[]
}

export interface InboxUnreadCount {
  unread_count: number
}

export interface InboxNotificationReadAck {
  id: string
  read_at: string
}

export interface AnonymizeAccepted {
  status: string
  anonymized_at: string
  scheduled?: string[]
  user_id?: string | null
}

/** Public privacy policy document (`GET /legal/privacy-policy`). */
export interface PrivacyPolicy {
  title: string
  body: string
  version: string
  updated_at: string
}

export interface ProfileAnswerSaved {
  saved: true
  profile_gaps: string[]
  next_question: ProfileNext
}

export interface ProfileAnswerNeedsClarification {
  saved: false
  needs_clarification?: true
  diverted?: boolean
  prompt: string
  options?: GreetingOption[]
  checkup_offer?: boolean
  checkup_suggest?: string | null
  checkup_offer_label?: string | null
  individual_tests_url?: string | null
  next_question?: ProfileNext
  reply_actions?: ReplyActions | null
}

export interface ProfileAnswerTurnLimit {
  saved: false
  turn_limit: true
  prompt: string
  next_question?: ProfileNext
  reply_actions?: ReplyActions | null
}

export type ProfileAnswerResult
  = ProfileAnswerSaved
    | ProfileAnswerNeedsClarification
    | ProfileAnswerTurnLimit

export type ClaimGuardStatus = 'passed' | 'rewritten' | 'blocked'

export type ChatTurnType = 'profile' | 'message' | 'external'

export interface ChatTurnMeta {
  type: ChatTurnType
}

export interface ChatProfileQuestion {
  gap_code: string
  answer_type: ProfileAnswerType
}

export interface ChatExternalPayload {
  items: Array<{ key: string, value: string }>
}

export interface StreamMessageResult {
  message_id: string
  content: string
  claim_guard: ClaimGuardStatus
  options: GreetingOption[]
  options_kind?: 'consultation_goals' | null
  turn: ChatTurnMeta
  profile_question: ChatProfileQuestion | null
  external: ChatExternalPayload | null
  profile_gaps: string[]
  /** Server: intake says within 1y and conversation has no report yet. */
  upload_offer?: boolean
  checkup_offer?: boolean
  checkup_suggest?: string | null
  checkup_offer_label?: string | null
  individual_tests_url?: string | null
  /**
   * Semantic-judgment CTA column (schema v0.1). Prefer over legacy offer fields
   * when usable; see `app/utils/reply-actions.ts`.
   */
  reply_actions?: ReplyActions | null
  /**
   * Journey path after this turn when core includes it on SSE `done` (core #139).
   * Prefer lowercase `a|b|c`; FE normalizes.
   * Key absent → do not overwrite FE path; explicit `null` → unselected (treat as A).
   */
  path?: 'a' | 'b' | 'c' | 'A' | 'B' | 'C' | null
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

/** localStorage key for the privacy-policy `version` the user last accepted (cookie consent). */
export const PRIVACY_CONSENT_VERSION_KEY = 'candor.privacy.consent.version'
