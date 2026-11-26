/** Candor agent v2 (isolated) — types and pure helpers. */

export const AGENT_V2_REQUIREMENTS = ['profile', 'report', 'goals'] as const

export type AgentV2Requirement = (typeof AGENT_V2_REQUIREMENTS)[number]

export type AgentV2ActionKey = string

export interface AgentV2Action {
  key: AgentV2ActionKey
  label: string
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
}

/** POST/GET create + fetch envelope (data). */
export interface AgentV2ConversationBundle {
  conversation: AgentV2Conversation
  messages?: AgentV2Message[]
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

/** Existing recommendations entry used by /chat offer_recommend. */
export const AGENT_V2_RECOMMENDATIONS_PATH = '/app/recommendations'

/** localStorage key for the open v2 conversation id (isolated from journey). */
export const AGENT_V2_CONVERSATION_STORAGE_KEY = 'candor.agent.v2.conversationId'

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
    out.push({ key, label })
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

/**
 * Map v2 `actions` → v1 `reply_actions` so ChatPanel／TurnActions can paint
 * the same CTA chrome. Only known keys are projected; unknown keys are ignored
 * (do not invent buttons from reply text).
 */
export function agentV2ActionsToReplyActions(
  actions: readonly AgentV2Action[]
): {
  schema_version: '0.1'
  source: 'semantic_judgment'
  adaptor: 'llm'
  degraded: false
  error: null
  actions: Array<{
    type: 'offer_recommend'
    payload: {
      mode: 'view_recommendations'
      label: string
      path: string
    }
  }>
} | null {
  const offer = actions.find(action => isOfferRecommendAction(action))
  if (!offer) {
    return null
  }
  return {
    schema_version: '0.1',
    source: 'semantic_judgment',
    adaptor: 'llm',
    degraded: false,
    error: null,
    actions: [{
      type: 'offer_recommend',
      payload: {
        mode: 'view_recommendations',
        label: offer.label,
        path: AGENT_V2_RECOMMENDATIONS_PATH
      }
    }]
  }
}
