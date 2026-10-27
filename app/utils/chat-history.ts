/**
 * Conversation history → ChatMessage mapping (reply_actions v0.1).
 * Same CTA / dedupe rules as SSE `done` via message.replyActions → buildTurnActionsVisibility.
 */

import type { ChatMessage, ChatMessageOption } from './first-order'
import { parseReplyActions } from './reply-actions'

export interface ConversationHistoryMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  options?: ChatMessageOption[]
  options_kind?: 'consultation_goals' | null
  turn?: { type: 'profile' | 'message' | 'external' } | null
  profile_question?: { gap_code: string, answer_type: string } | null
  profile_gaps?: string[]
  upload_offer?: boolean
  checkup_offer?: boolean
  checkup_suggest?: string | null
  checkup_offer_label?: string | null
  individual_tests_url?: string | null
  reply_actions?: unknown
}

export interface ConversationMessagesResult {
  conversation_id?: string
  messages: ConversationHistoryMessage[]
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function asOptions(raw: unknown): ChatMessageOption[] {
  if (!Array.isArray(raw)) {
    return []
  }
  const out: ChatMessageOption[] = []
  for (const item of raw) {
    if (!isRecord(item)) {
      continue
    }
    const code = typeof item.code === 'string' ? item.code : ''
    const label = typeof item.label === 'string' ? item.label : ''
    if (code && label) {
      out.push({ code, label })
    }
  }
  return out
}

/**
 * Tolerant parse of GET /conversation/{id}/messages `data` payload.
 * Accepts `{ messages: [...] }` or a bare messages array.
 */
export function parseConversationMessagesResult(raw: unknown): ConversationMessagesResult {
  if (Array.isArray(raw)) {
    return {
      messages: raw
        .map(parseHistoryMessage)
        .filter((m): m is ConversationHistoryMessage => m !== null)
    }
  }
  if (!isRecord(raw)) {
    return { messages: [] }
  }
  const list = Array.isArray(raw.messages) ? raw.messages : []
  return {
    conversation_id: typeof raw.conversation_id === 'string' ? raw.conversation_id : undefined,
    messages: list
      .map(parseHistoryMessage)
      .filter((m): m is ConversationHistoryMessage => m !== null)
  }
}

export function parseHistoryMessage(raw: unknown): ConversationHistoryMessage | null {
  if (!isRecord(raw)) {
    return null
  }
  const id = typeof raw.id === 'string'
    ? raw.id
    : (typeof raw.message_id === 'string' ? raw.message_id : '')
  const roleRaw = typeof raw.role === 'string' ? raw.role : ''
  const role = roleRaw === 'user' || roleRaw === 'assistant' ? roleRaw : null
  const content = typeof raw.content === 'string'
    ? raw.content
    : (typeof raw.text === 'string' ? raw.text : '')
  if (!id || !role) {
    return null
  }

  const turnRaw = isRecord(raw.turn) ? raw.turn : null
  const turnTypeRaw = turnRaw && typeof turnRaw.type === 'string' ? turnRaw.type : null
  const turn: ConversationHistoryMessage['turn']
    = turnTypeRaw === 'profile' || turnTypeRaw === 'message' || turnTypeRaw === 'external'
      ? { type: turnTypeRaw }
      : null

  const pqRaw = isRecord(raw.profile_question) ? raw.profile_question : null
  const profile_question = pqRaw
    && typeof pqRaw.gap_code === 'string'
    && typeof pqRaw.answer_type === 'string'
    ? { gap_code: pqRaw.gap_code, answer_type: pqRaw.answer_type }
    : null

  return {
    id,
    role,
    content,
    options: asOptions(raw.options),
    options_kind: raw.options_kind === 'consultation_goals' ? 'consultation_goals' : null,
    turn,
    profile_question,
    profile_gaps: Array.isArray(raw.profile_gaps)
      ? raw.profile_gaps.filter((g): g is string => typeof g === 'string')
      : undefined,
    upload_offer: raw.upload_offer === true,
    checkup_offer: raw.checkup_offer === true,
    checkup_suggest: typeof raw.checkup_suggest === 'string' ? raw.checkup_suggest : null,
    checkup_offer_label: typeof raw.checkup_offer_label === 'string'
      ? raw.checkup_offer_label
      : null,
    individual_tests_url: typeof raw.individual_tests_url === 'string'
      ? raw.individual_tests_url
      : null,
    reply_actions: raw.reply_actions
  }
}

/** Map one history row to the client ChatMessage used by TurnActions. */
export function historyMessageToChatMessage(row: ConversationHistoryMessage): ChatMessage {
  const replyActions = parseReplyActions(row.reply_actions)
  const message: ChatMessage = {
    id: row.id,
    role: row.role,
    parts: [{ type: 'text', text: row.content }]
  }
  if (row.options?.length) {
    message.options = row.options.map(o => ({ ...o }))
  }
  if (row.turn?.type) {
    message.turnType = row.turn.type
  }
  if (row.profile_question) {
    message.profileQuestion = { ...row.profile_question }
  }
  if (row.profile_gaps?.length) {
    message.profileGaps = [...row.profile_gaps]
  }
  if (row.upload_offer) {
    message.uploadOffer = true
  }
  if (row.checkup_offer) {
    message.checkupOffer = true
  }
  if (replyActions) {
    message.replyActions = replyActions
  }
  return message
}

/**
 * Normalize a message restored from journey localStorage so `replyActions`
 * is always a parsed ReplyActions object (or omitted).
 */
export function normalizeStoredChatMessage(raw: unknown): ChatMessage | null {
  if (!isRecord(raw)) {
    return null
  }
  const id = typeof raw.id === 'string' ? raw.id : ''
  const role = raw.role === 'user' || raw.role === 'assistant' ? raw.role : null
  if (!id || !role) {
    return null
  }
  const parts = Array.isArray(raw.parts)
    ? raw.parts.filter(isRecord).map(part => ({
        type: part.type === 'file' ? 'file' as const : 'text' as const,
        text: typeof part.text === 'string' ? part.text : undefined,
        name: typeof part.name === 'string' ? part.name : undefined
      }))
    : [{ type: 'text' as const, text: '' }]

  const message: ChatMessage = { id, role, parts }
  if (Array.isArray(raw.options)) {
    message.options = asOptions(raw.options)
  }
  if (raw.turnType === 'profile' || raw.turnType === 'message' || raw.turnType === 'external') {
    message.turnType = raw.turnType
  }
  if (isRecord(raw.profileQuestion)
    && typeof raw.profileQuestion.gap_code === 'string'
    && typeof raw.profileQuestion.answer_type === 'string') {
    message.profileQuestion = {
      gap_code: raw.profileQuestion.gap_code,
      answer_type: raw.profileQuestion.answer_type
    }
  } else if (raw.profileQuestion === null) {
    message.profileQuestion = null
  }
  if (Array.isArray(raw.profileGaps)) {
    message.profileGaps = raw.profileGaps.filter((g): g is string => typeof g === 'string')
  }
  if (raw.uploadOffer === true) {
    message.uploadOffer = true
  }
  if (raw.checkupOffer === true) {
    message.checkupOffer = true
  }
  if (raw.wantMoreTestsOffer === true) {
    message.wantMoreTestsOffer = true
  }
  if (raw.notice === true) {
    message.notice = true
  }
  // Accept either camelCase (snapshot) or snake_case (accidental API dump).
  const replyRaw = raw.replyActions !== undefined ? raw.replyActions : raw.reply_actions
  const replyActions = parseReplyActions(replyRaw)
  if (replyActions) {
    message.replyActions = replyActions
  }
  return message
}

export function normalizeStoredChatMessages(raw: unknown): ChatMessage[] {
  if (!Array.isArray(raw)) {
    return []
  }
  return raw
    .map(normalizeStoredChatMessage)
    .filter((m): m is ChatMessage => m !== null)
}
