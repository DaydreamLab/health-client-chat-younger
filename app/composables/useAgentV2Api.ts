import { CandorApiError, TOKEN_STORAGE_KEY } from '~/utils/candor-api'
import type { ApiFailed, ApiSuccess } from '~/utils/candor-api'
import {
  agentV2ApiBase,
  normalizeAgentV2Actions,
  normalizeAgentV2Missing,
  type AgentV2Conversation,
  type AgentV2ConversationBundle,
  type AgentV2Message,
  type AgentV2TurnResult
} from '~/utils/agent-v2'

function readToken(): string | null {
  if (!import.meta.client) {
    return null
  }
  return localStorage.getItem(TOKEN_STORAGE_KEY)
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

function normalizeConversation(raw: unknown): AgentV2Conversation {
  if (!raw || typeof raw !== 'object') {
    throw new CandorApiError('Invalid conversation', 500, 'unknown')
  }
  const id = String((raw as { id?: unknown }).id ?? '').trim()
  if (!id) {
    throw new CandorApiError('Invalid conversation id', 500, 'unknown')
  }
  const stateRaw = (raw as { state?: unknown }).state
  const missing = normalizeAgentV2Missing((raw as { missing?: unknown }).missing)
  return {
    id,
    state: stateRaw == null ? null : String(stateRaw),
    missing
  }
}

function normalizeMessage(raw: unknown, index: number): AgentV2Message | null {
  if (!raw || typeof raw !== 'object') {
    return null
  }
  const roleRaw = String((raw as { role?: unknown }).role ?? '').trim()
  const role = roleRaw === 'user' || roleRaw === 'assistant' ? roleRaw : null
  const text = String(
    (raw as { text?: unknown }).text
    ?? (raw as { content?: unknown }).content
    ?? ''
  ).trim()
  if (!role || !text) {
    return null
  }
  const id = String((raw as { id?: unknown }).id ?? `msg-${index}`).trim() || `msg-${index}`
  const actions = normalizeAgentV2Actions((raw as { actions?: unknown }).actions)
  return actions.length > 0
    ? { id, role, text, actions }
    : { id, role, text }
}

function normalizeMessages(raw: unknown): AgentV2Message[] {
  if (!Array.isArray(raw)) {
    return []
  }
  const out: AgentV2Message[] = []
  raw.forEach((item, index) => {
    const msg = normalizeMessage(item, index)
    if (msg) {
      out.push(msg)
    }
  })
  return out
}

function normalizeBundle(data: {
  conversation: unknown
  messages?: unknown
  actions?: unknown
}): AgentV2ConversationBundle {
  const actions = normalizeAgentV2Actions(data.actions)
  return {
    conversation: normalizeConversation(data.conversation),
    messages: normalizeMessages(data.messages),
    ...(actions.length > 0 ? { actions } : {})
  }
}

function normalizeTurn(raw: unknown): AgentV2TurnResult {
  if (!raw || typeof raw !== 'object') {
    throw new CandorApiError('Invalid turn result', 500, 'unknown')
  }
  const conversationId = String(
    (raw as { conversation_id?: unknown }).conversation_id ?? ''
  ).trim()
  if (!conversationId) {
    throw new CandorApiError('Invalid conversation_id', 500, 'unknown')
  }
  const replyRaw = (raw as { reply?: unknown }).reply
  const replyText = replyRaw && typeof replyRaw === 'object'
    ? String((replyRaw as { text?: unknown }).text ?? '').trim()
    : ''
  return {
    conversation_id: conversationId,
    state: String((raw as { state?: unknown }).state ?? ''),
    missing: normalizeAgentV2Missing((raw as { missing?: unknown }).missing),
    reply: { text: replyText },
    actions: normalizeAgentV2Actions((raw as { actions?: unknown }).actions)
  }
}

/**
 * Isolated agent v2 HTTP client. Hits `/api/v2/*` (derived from public.apiBase).
 * Auth: same Bearer token as member APIs (`candor.guest.token`).
 */
export function useAgentV2Api() {
  function apiBase(): string {
    const config = useRuntimeConfig()
    return agentV2ApiBase(String(config.public.apiBase || 'http://localhost:8080/api/v1'))
  }

  async function request<T>(
    path: string,
    options: {
      method?: 'GET' | 'POST'
      body?: Record<string, unknown>
      auth?: boolean
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

    if (options.body !== undefined) {
      headers['Content-Type'] = 'application/json'
    }

    const url = `${apiBase()}${path}`
    try {
      const payload = await $fetch<ApiSuccess<T>>(url, {
        method: options.method || 'GET',
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

  /**
   * LY5: create may include greeting `messages` + pending `actions` (LC4+).
   * Older cores return only `{ conversation }` — FE tolerates empty transcript.
   */
  async function createConversation(): Promise<AgentV2ConversationBundle> {
    const data = await request<{
      conversation: unknown
      messages?: unknown
      actions?: unknown
    }>('/conversations', {
      method: 'POST',
      body: {}
    })
    return normalizeBundle(data)
  }

  async function getConversation(id: string): Promise<AgentV2ConversationBundle> {
    const data = await request<{
      conversation: unknown
      messages?: unknown
      actions?: unknown
    }>(`/conversations/${encodeURIComponent(id)}`)
    return normalizeBundle(data)
  }

  async function sendMessage(id: string, text: string): Promise<AgentV2TurnResult> {
    const data = await request<unknown>(
      `/conversations/${encodeURIComponent(id)}/messages`,
      {
        method: 'POST',
        body: { text }
      }
    )
    return normalizeTurn(data)
  }

  async function postAction(id: string, key: string): Promise<AgentV2TurnResult> {
    const data = await request<unknown>(
      `/conversations/${encodeURIComponent(id)}/actions`,
      {
        method: 'POST',
        body: { key }
      }
    )
    return normalizeTurn(data)
  }

  return {
    createConversation,
    getConversation,
    sendMessage,
    postAction
  }
}
