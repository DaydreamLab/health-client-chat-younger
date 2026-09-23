import type {
  ApiFailed,
  ApiSuccess,
  ConversationAttachAck,
  ConversationCreate,
  HealthReport,
  HealthReportRetryAck,
  HealthReportUploadAck,
  ProfileAnswerResult,
  ProfileNext,
  StreamMessageResult,
  UserMe,
  UserSession
} from '~/utils/candor-api'
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

async function parseFailedResponse(res: Response): Promise<CandorApiError> {
  try {
    const payload = await res.json() as ApiFailed
    if (payload && payload.status === 'failed') {
      return new CandorApiError(
        payload.error_message || 'Request failed',
        res.status,
        payload.error_code || 'unknown',
        payload.error_data
      )
    }
  } catch {
    // fall through
  }

  return new CandorApiError(res.statusText || 'Request failed', res.status, 'unknown')
}

export function useCandorApi() {
  async function request<T>(
    path: string,
    options: {
      method?: string
      body?: Record<string, unknown> | FormData
      auth?: boolean | 'optional'
      query?: Record<string, string | undefined>
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

    let url = `${apiBase()}${path}`
    if (options.query) {
      const params = new URLSearchParams()
      for (const [key, value] of Object.entries(options.query)) {
        if (value) {
          params.set(key, value)
        }
      }
      const qs = params.toString()
      if (qs) {
        url += `?${qs}`
      }
    }

    const isForm = typeof FormData !== 'undefined' && options.body instanceof FormData
    if (!isForm && options.body !== undefined) {
      headers['Content-Type'] = 'application/json'
    }

    try {
      const payload = await $fetch<ApiSuccess<T>>(url, {
        method: (options.method || 'GET') as 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE',
        body: options.body as Record<string, unknown> | FormData | undefined,
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

  async function streamMessage(
    conversationId: string,
    content: string,
    handlers: {
      onDelta?: (chunk: string) => void
      onReplace?: (text: string) => void
    } = {}
  ): Promise<StreamMessageResult> {
    const token = readToken()
    if (!token) {
      throw new CandorApiError('Missing token', 401, 'unauthorized')
    }

    const url = `${apiBase()}/conversations/${encodeURIComponent(conversationId)}/messages/stream`
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Accept': 'text/event-stream',
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ content })
    })

    const ct = res.headers.get('content-type') || ''
    if (!res.ok || !ct.includes('text/event-stream')) {
      throw await parseFailedResponse(res)
    }

    if (!res.body) {
      throw new CandorApiError('Empty stream body', 500, 'unknown')
    }

    const reader = res.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''
    let full = ''
    let messageId = ''
    let claimGuard: StreamMessageResult['claim_guard'] = 'passed'

    while (true) {
      const { done, value } = await reader.read()
      if (done) {
        break
      }

      buffer += decoder.decode(value, { stream: true })
      const parts = buffer.split('\n\n')
      buffer = parts.pop() || ''

      for (const part of parts) {
        const lines = part.split('\n')
        let eventName = 'message'
        let dataLine = ''
        for (const line of lines) {
          if (line.startsWith('event:')) {
            eventName = line.slice(6).trim()
          } else if (line.startsWith('data:')) {
            dataLine += line.slice(5).trim()
          }
        }
        if (!dataLine) {
          continue
        }

        let data: Record<string, unknown>
        try {
          data = JSON.parse(dataLine) as Record<string, unknown>
        } catch {
          continue
        }

        if (eventName === 'delta') {
          const chunk = String(data.text || '')
          full += chunk
          handlers.onDelta?.(chunk)
        } else if (eventName === 'blocked') {
          full = String(data.content || '')
          messageId = String(data.message_id || messageId)
          claimGuard = 'blocked'
          handlers.onReplace?.(full)
        } else if (eventName === 'done') {
          full = String(data.content || full)
          messageId = String(data.message_id || messageId)
          const guard = data.claim_guard
          if (guard === 'passed' || guard === 'rewritten' || guard === 'blocked') {
            claimGuard = guard
          }
          handlers.onReplace?.(full)
        } else if (eventName === 'error') {
          const err = data.error as { code?: string, message?: string } | undefined
          throw new CandorApiError(
            err?.message || 'stream error',
            500,
            err?.code || 'stream_error'
          )
        }
      }
    }

    return {
      message_id: messageId || crypto.randomUUID(),
      content: full,
      claim_guard: claimGuard
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
    me: () => request<UserMe>('/users/me'),

    createConversation: (body: { report_id?: string, renewal_of_order_id?: string } = {}) =>
      request<ConversationCreate>('/conversations', { method: 'POST', body }),
    attachReport: (conversationId: string, reportId: string) =>
      request<ConversationAttachAck>(`/conversations/${encodeURIComponent(conversationId)}`, {
        method: 'PATCH',
        body: { report_id: reportId }
      }),
    streamMessage,

    uploadHealthReport: (file: File) => {
      const form = new FormData()
      form.append('file', file)
      return request<HealthReportUploadAck>('/health-reports', { method: 'POST', body: form })
    },
    getHealthReport: (id: string) =>
      request<HealthReport>(`/health-reports/${encodeURIComponent(id)}`),
    retryHealthReport: (id: string) =>
      request<HealthReportRetryAck>(`/health-reports/${encodeURIComponent(id)}/retry`, {
        method: 'POST'
      }),

    nextProfileQuestion: (reportId?: string | null) =>
      request<ProfileNext>('/profile/questions/next', {
        query: reportId ? { report_id: reportId } : undefined
      }),
    submitProfileAnswer: (body: {
      gap_code: string
      value?: string | number | boolean | null
      raw_text?: string | null
    }) => request<ProfileAnswerResult>('/profile/answers', { method: 'POST', body })
  }
}
