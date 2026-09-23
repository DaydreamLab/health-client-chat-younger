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
