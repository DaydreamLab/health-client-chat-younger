/** Candor agent v2 (isolated) — types and pure helpers. */

import type { ReplyActions, ReplyAction, VitalsField } from './reply-actions'
import { defaultConsultationGoalOptions } from './consultation-goal-defaults'

export const AGENT_V2_REQUIREMENTS = ['profile', 'report', 'goals'] as const

export type AgentV2Requirement = (typeof AGENT_V2_REQUIREMENTS)[number]

export type AgentV2ActionKey = string

export interface AgentV2Action {
  key: AgentV2ActionKey
  label: string
  /** Optional structured payload from core emit_actions／propose_* (LC4+). */
  payload?: Record<string, unknown> | null
}

export interface AgentV2Reply {
  text: string
}

export interface AgentV2Conversation {
  id: string
  state?: string | null
  missing?: AgentV2Requirement[] | null
}

export interface AgentV2Message {
  id: string
  role: 'user' | 'assistant'
  text: string
  /** Optional per-message actions when core hydrates them (LY5). */
  actions?: AgentV2Action[]
}

/** POST/GET create + fetch envelope (data). */
export interface AgentV2ConversationBundle {
  conversation: AgentV2Conversation
  messages?: AgentV2Message[]
  /** Create-time greeting actions (LY5); absent on older cores. */
  actions?: AgentV2Action[]
}

/** POST messages / actions turn result. */
export interface AgentV2TurnResult {
  conversation_id: string
  state: string
  missing: AgentV2Requirement[]
  reply: AgentV2Reply
  actions: AgentV2Action[]
}

export const AGENT_V2_OFFER_RECOMMEND_KEY = 'offer_recommend'
export const AGENT_V2_ASK_VITALS_KEY = 'ask_vitals'
export const AGENT_V2_ASK_REPORT_KEY = 'ask_report'
export const AGENT_V2_ASK_GOAL_KEY = 'ask_goal'
export const AGENT_V2_CHOOSE_OPTION_KEY = 'choose_option'
export const AGENT_V2_CONFIRM_REPORT_DATE_KEY = 'confirm_report_date'
/** Soft retry after a failed turn (LY5); ignored until wired. */
export const AGENT_V2_RETRY_KEY = 'retry'

/**
 * Known FE-projected keys (design §2／§7／§11 + spec 35).
 * Unknown keys are ignored (never invent buttons from reply text).
 */
export const AGENT_V2_PROJECTED_ACTION_KEYS = [
  AGENT_V2_OFFER_RECOMMEND_KEY,
  AGENT_V2_ASK_VITALS_KEY,
  AGENT_V2_ASK_REPORT_KEY,
  AGENT_V2_ASK_GOAL_KEY,
  AGENT_V2_CHOOSE_OPTION_KEY,
  AGENT_V2_CONFIRM_REPORT_DATE_KEY,
  AGENT_V2_RETRY_KEY
] as const

export type AgentV2ProjectedActionKey = (typeof AGENT_V2_PROJECTED_ACTION_KEYS)[number]

/** Existing recommendations entry used by /chat offer_recommend. */
export const AGENT_V2_RECOMMENDATIONS_PATH = '/app/recommendations'

/** Query key carrying v2 conversation context into recommendations／checkout (LY4). */
export const AGENT_V2_CONVERSATION_QUERY_KEY = 'agent_v2_conversation_id'

/** localStorage key for the open v2 conversation id (isolated from journey). */
export const AGENT_V2_CONVERSATION_STORAGE_KEY = 'candor.agent.v2.conversationId'

/** Read v2 conversation id from a route query (never treat it as a v1 conversation id). */
export function agentV2ConversationIdFromQuery(query: Record<string, unknown> | {
  [key: string]: unknown
}): string | null {
  const raw = query[AGENT_V2_CONVERSATION_QUERY_KEY]
  const value = Array.isArray(raw) ? raw[0] : raw
  const id = String(value ?? '').trim()
  return id || null
}

const DEFAULT_VITALS_FIELDS: VitalsField[] = ['age', 'height', 'weight']

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function asVitalsFields(raw: unknown): VitalsField[] {
  if (!Array.isArray(raw)) {
    return []
  }
  const allowed = new Set<string>(['age', 'height', 'weight'])
  const out: VitalsField[] = []
  for (const item of raw) {
    if (typeof item === 'string' && allowed.has(item) && !out.includes(item as VitalsField)) {
      out.push(item as VitalsField)
    }
  }
  return out
}

export function isAgentV2EnabledFlag(value: unknown): boolean {
  return value === true || value === '1' || value === 1
}

/** Derive `/api/v2` base from existing `/api/v1` public.apiBase. */
export function agentV2ApiBase(apiBase: string): string {
  const base = String(apiBase || '').replace(/\/$/, '')
  if (base.endsWith('/api/v1')) {
    return `${base.slice(0, -'/api/v1'.length)}/api/v2`
  }
  if (/\/api\/v\d+$/.test(base)) {
    return base.replace(/\/api\/v\d+$/, '/api/v2')
  }
  return `${base}/api/v2`
}

export function normalizeAgentV2Missing(raw: unknown): AgentV2Requirement[] {
  if (!Array.isArray(raw)) {
    return []
  }
  const allowed = new Set<string>(AGENT_V2_REQUIREMENTS)
  const out: AgentV2Requirement[] = []
  for (const item of raw) {
    if (typeof item === 'string' && allowed.has(item) && !out.includes(item as AgentV2Requirement)) {
      out.push(item as AgentV2Requirement)
    }
  }
  return out
}

export function normalizeAgentV2Actions(raw: unknown): AgentV2Action[] {
  if (!Array.isArray(raw)) {
    return []
  }
  const out: AgentV2Action[] = []
  for (const item of raw) {
    if (!item || typeof item !== 'object') {
      continue
    }
    const key = String((item as { key?: unknown }).key ?? '').trim()
    const label = String((item as { label?: unknown }).label ?? '').trim()
    if (!key || !label) {
      continue
    }
    const payloadRaw = (item as { payload?: unknown }).payload
    const payload = isRecord(payloadRaw) ? payloadRaw : (payloadRaw === null ? null : undefined)
    out.push(payload !== undefined ? { key, label, payload } : { key, label })
  }
  return out
}

export function agentV2RequirementDone(
  requirement: AgentV2Requirement,
  missing: readonly AgentV2Requirement[]
): boolean {
  return !missing.includes(requirement)
}

export function isOfferRecommendAction(action: Pick<AgentV2Action, 'key'>): boolean {
  return action.key === AGENT_V2_OFFER_RECOMMEND_KEY
}

export function isConfirmReportDateAction(action: Pick<AgentV2Action, 'key'>): boolean {
  return action.key === AGENT_V2_CONFIRM_REPORT_DATE_KEY
}

function replyShell(actions: ReplyAction[]): ReplyActions {
  return {
    schema_version: '0.1',
    source: 'semantic_judgment',
    adaptor: 'llm',
    degraded: false,
    error: null,
    actions
  }
}

function projectAskVitals(action: AgentV2Action): ReplyAction {
  const fields = asVitalsFields(action.payload?.fields)
  const resolved = fields.length > 0 ? fields : DEFAULT_VITALS_FIELDS
  const gapCode = typeof action.payload?.gap_code === 'string'
    ? action.payload.gap_code
    : null
  return {
    type: 'ask_vitals',
    payload: {
      fields: resolved,
      ...(gapCode ? { gap_code: gapCode } : {})
    }
  }
}

function projectAskGoal(action: AgentV2Action): ReplyAction {
  const codesRaw = action.payload?.goal_codes
  const goalCodes = Array.isArray(codesRaw)
    ? codesRaw.filter((code): code is string => typeof code === 'string' && code.trim() !== '')
    : []
  return {
    type: 'ask_goal',
    payload: goalCodes.length > 0 ? { goal_codes: goalCodes } : {}
  }
}

function projectChooseOption(action: AgentV2Action): ReplyAction {
  const payload = isRecord(action.payload) ? { ...action.payload } : {}
  // Ensure consultation_goals always has chips when core omits options.
  if (payload.kind === 'consultation_goals') {
    const options = Array.isArray(payload.options) ? payload.options : []
    if (options.length < 2) {
      payload.options = defaultConsultationGoalOptions()
      payload.mode = payload.mode ?? 'multi'
      payload.confirm = payload.confirm !== false
    }
  }
  return {
    type: 'choose_option',
    payload
  }
}

function projectConfirmReportDate(action: AgentV2Action): ReplyAction {
  return {
    type: 'choose_option',
    payload: {
      kind: 'free',
      mode: 'single',
      confirm: false,
      options: [{
        code: AGENT_V2_CONFIRM_REPORT_DATE_KEY,
        label: action.label || '確認報告日期無誤'
      }]
    }
  }
}

function projectOfferRecommend(action: AgentV2Action): ReplyAction {
  return {
    type: 'offer_recommend',
    payload: {
      mode: 'view_recommendations',
      label: action.label,
      path: AGENT_V2_RECOMMENDATIONS_PATH
    }
  }
}

function projectOne(action: AgentV2Action): ReplyAction | null {
  switch (action.key) {
    case AGENT_V2_OFFER_RECOMMEND_KEY:
      return projectOfferRecommend(action)
    case AGENT_V2_ASK_VITALS_KEY:
      return projectAskVitals(action)
    case AGENT_V2_ASK_REPORT_KEY:
      return { type: 'ask_report', payload: {} }
    case AGENT_V2_ASK_GOAL_KEY:
      return projectAskGoal(action)
    case AGENT_V2_CHOOSE_OPTION_KEY:
      return projectChooseOption(action)
    case AGENT_V2_CONFIRM_REPORT_DATE_KEY:
      return projectConfirmReportDate(action)
    case AGENT_V2_RETRY_KEY:
      // LY5 paints retry via streamFailed／explicit handler; key alone is not a RA type.
      return null
    default:
      return null
  }
}

/**
 * Map v2 `actions` → v1 `reply_actions` so ChatPanel／TurnActions／AskVitalsCard
 * can paint the same CTA chrome. Only known keys are projected; unknown keys
 * are ignored (do not invent buttons from reply text).
 */
export function agentV2ActionsToReplyActions(
  actions: readonly AgentV2Action[]
): ReplyActions | null {
  const projected: ReplyAction[] = []
  for (const action of actions) {
    const item = projectOne(action)
    if (item) {
      projected.push(item)
    }
  }
  if (projected.length === 0) {
    return null
  }
  return replyShell(projected)
}

const READY_REPORT_STATUSES = new Set(['ready', 'needs_review'])

/**
 * Pick a report id for the /chat ReportDataDock on agent v2.
 * Prefer an existing bound id; otherwise the first ready／needs_review row
 * from GET /health-reports. Does not invent conversation state.
 */
export function pickReadyHealthReportId(
  boundReportId: string | null | undefined,
  reports: ReadonlyArray<{ id?: string | null, status?: string | null }>
): string | null {
  const bound = String(boundReportId ?? '').trim()
  if (bound) {
    return bound
  }
  for (const row of reports) {
    const id = String(row.id ?? '').trim()
    const status = String(row.status ?? '').trim()
    if (id && READY_REPORT_STATUSES.has(status)) {
      return id
    }
  }
  return null
}
