import type { ApiFailed, ApiSuccess, UserMe, UserSession } from '~/utils/candor-api'
import { CandorApiError, TOKEN_STORAGE_KEY } from '~/utils/candor-api'

function apiBase(): string {
  const config = useRuntimeConfig()
  return String(config.public.apiBase || 'http://localhost:8080/api/v1').replace(/\/$/, '')
}

function readToken(): string | null {
  if (!import.meta.client) {
    return null
  }

  return localStorage.getItem(TOKEN_STORAGE_KEY)
}

function writeToken(token: string | null) {
  if (!import.meta.client) {
    return
  }

  if (token) {
    localStorage.setItem(TOKEN_STORAGE_KEY, token)
  } else {
    localStorage.removeItem(TOKEN_STORAGE_KEY)
  }
}

async function parseFailed(error: unknown): Promise<CandorApiError> {
  if (error && typeof error === 'object' && 'data' in error) {
    const data = (error as { data?: ApiFailed, statusCode?: number }).data
    const statusCode = (error as { statusCode?: number }).statusCode ?? 500
    if (data && data.status === 'failed') {
      return new CandorApiError(
        data.error_message || 'Request failed',
        statusCode,
        data.error_code || 'unknown',
        data.error_data
      )
    }
  }

  if (error instanceof CandorApiError) {
    return error
  }

  return new CandorApiError('Request failed', 500, 'unknown')
}

export function useCandorApi() {
  async function request<T>(
    path: string,
    options: {
      method?: string
      body?: Record<string, unknown>
      auth?: boolean | 'optional'
    } = {}
  ): Promise<T> {
    const headers: Record<string, string> = {
      Accept: 'application/json'
    }
    const authMode = options.auth ?? true
    if (authMode !== false) {
      const token = readToken()
      if (token) {
        headers.Authorization = `Bearer ${token}`
      } else if (authMode === true) {
        throw new CandorApiError('Missing token', 401, 'unauthorized')
      }
    }

    try {
      const payload = await $fetch<ApiSuccess<T>>(`${apiBase()}${path}`, {
        method: (options.method || 'GET') as 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE',
        body: options.body,
        headers
      })
      if (payload.status !== 'success') {
        throw new CandorApiError('Unexpected response', 500, 'unknown')
      }

      return payload.data
    } catch (error) {
      throw await parseFailed(error)
    }
  }

  return {
    readToken,
    writeToken,
    guest: () => request<UserSession>('/auth/guest', { method: 'POST', auth: false }),
    register: (body: { email: string, password: string, display_name?: string }) =>
      request<UserSession>('/auth/register', { method: 'POST', body, auth: 'optional' }),
    login: (body: { email: string, password: string }) =>
      request<UserSession>('/auth/login', { method: 'POST', body, auth: false }),
    refresh: () => request<UserSession>('/auth/refresh', { method: 'POST' }),
    me: () => request<UserMe>('/users/me')
  }
}
