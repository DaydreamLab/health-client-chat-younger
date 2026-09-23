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

export interface ConversationGreeting {
  message_id: string
  role: string
  content: string
  options: GreetingOption[]
}

export interface ConversationCreate {
  id: string
  report_id?: string | null
  renewal_of_order_id?: string | null
  greeting: ConversationGreeting
}

export interface ConversationAttachAck {
  id: string
  report_id: string
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

export interface HealthReport {
  id: string
  status: string
  page_count?: number | null
  extraction_confidence?: number | null
  content_type?: string | null
  error?: string | null
  results?: unknown[] | null
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
  options?: string[] | null
}

export type ProfileNext = ProfileNextDone | ProfileNextQuestion

export interface ProfileAnswerSaved {
  saved: true
  profile_gaps: string[]
}

export interface ProfileAnswerNeedsClarification {
  saved: false
  needs_clarification: true
  prompt: string
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
