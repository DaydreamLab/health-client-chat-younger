/**
 * Optional Agent v2 SSE client (LY6／LC7).
 * Default sync path stays; streaming is opt-in and falls back on 404／non-SSE.
 * Fake／mock tests never hit a real model.
 */

import {
  normalizeAgentV2Actions,
  normalizeAgentV2Missing,
  type AgentV2TurnResult
} from './agent-v2'

export function isAgentV2StreamingFlag(value: unknown): boolean {
  return value === true || value === '1' || value === 1
}

export interface AgentV2StreamHandlers {
  onDelta?: (chunk: string) => void
  onReplace?: (text: string) => void
}

function parseTurnFromDone(raw: unknown, conversationId: string): AgentV2TurnResult {
  if (!raw || typeof raw !== 'object') {
    return {
      conversation_id: conversationId,
      state: '',
      missing: [],
      reply: { text: '' },
      actions: []
    }
  }
  const replyRaw = (raw as { reply?: unknown }).reply
  const replyText = replyRaw && typeof replyRaw === 'object'
    ? String((replyRaw as { text?: unknown }).text ?? '').trim()
    : String((raw as { text?: unknown }).text ?? '').trim()
  const id = String(
    (raw as { conversation_id?: unknown }).conversation_id ?? conversationId
  ).trim() || conversationId
  return {
    conversation_id: id,
    state: String((raw as { state?: unknown }).state ?? ''),
    missing: normalizeAgentV2Missing((raw as { missing?: unknown }).missing),
    reply: { text: replyText },
    actions: normalizeAgentV2Actions((raw as { actions?: unknown }).actions)
  }
}

/**
 * Consume an SSE body shaped like v1 chat stream:
 * - event: delta  data: {"text":"…"}
 * - event: done   data: turn result JSON (same as POST …/messages)
 * Returns null when the response is not SSE (caller should fall back to sync).
 */
export async function consumeAgentV2Sse(
  res: Response,
  conversationId: string,
  handlers: AgentV2StreamHandlers = {}
): Promise<AgentV2TurnResult | null> {
  const ct = res.headers.get('content-type') || ''
  if (!res.ok || !ct.includes('text/event-stream') || !res.body) {
    return null
  }

  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  let full = ''
  let turn: AgentV2TurnResult | null = null

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
      let payload: unknown = dataLine
      try {
        payload = JSON.parse(dataLine)
      } catch {
        // plain text delta
      }

      if (eventName === 'delta') {
        const chunk = payload && typeof payload === 'object'
          ? String((payload as { text?: unknown }).text ?? '')
          : String(payload ?? '')
        if (chunk) {
          full += chunk
          handlers.onDelta?.(chunk)
        }
        continue
      }

      if (eventName === 'replace' || eventName === 'message') {
        const text = payload && typeof payload === 'object'
          ? String((payload as { text?: unknown }).text ?? '')
          : String(payload ?? '')
        if (text) {
          full = text
          handlers.onReplace?.(text)
        }
        continue
      }

      if (eventName === 'done') {
        turn = parseTurnFromDone(payload, conversationId)
        if (!turn.reply.text && full) {
          turn = { ...turn, reply: { text: full } }
        }
      }
    }
  }

  if (turn) {
    return turn
  }
  if (full) {
    return {
      conversation_id: conversationId,
      state: '',
      missing: [],
      reply: { text: full },
      actions: []
    }
  }
  return null
}
