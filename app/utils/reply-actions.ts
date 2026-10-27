/**
 * reply_actions v0.1 — parse, usable check, and CTA projection.
 * Contract: https://app.notion.com/p/3f2bb4588e818142be28c92e84ee39c5
 */

import type { ChatMessageOption } from './first-order'

export const REPLY_ACTIONS_SCHEMA_VERSION = '0.1'

export type ReplyActionAdaptor = 'llm' | 'laya' | 'fake'

export type ReplyActionType
  = 'ask_goal'
    | 'choose_option'
    | 'offer_recommend'
    | 'ask_report'
    | 'ask_vitals'
    | 'offer_checkup'
    | 'none'

export type ChooseOptionKind = 'consultation_goals' | 'profile' | 'free'

export type ChooseOptionMode = 'single' | 'multi'

export type VitalsField = 'age' | 'height' | 'weight'

export interface ChooseOptionPayload {
  kind?: ChooseOptionKind | string | null
  mode?: ChooseOptionMode | string | null
  confirm?: boolean | null
  options?: ChatMessageOption[] | null
  selected?: string[] | null
  gap_code?: string | null
  answer_type?: string | null
  exclusive_codes?: string[] | null
}

export interface AskGoalPayload {
  goal_codes?: string[] | null
}

export interface AskVitalsPayload {
  fields?: VitalsField[] | null
  /** Hybrid gap fill may attach the open gap. */
  gap_code?: string | null
}

export interface OfferCheckupPayload {
  url?: string | null
}

export interface ReplyAction {
  type: string
  payload?: Record<string, unknown> | null
}

export interface ReplyActions {
  schema_version?: string
  source?: string
  adaptor?: ReplyActionAdaptor | string
  actions: ReplyAction[]
  degraded?: boolean
  error?: string | null
}

const KNOWN_TYPES = new Set<string>([
  'ask_goal',
  'choose_option',
  'offer_recommend',
  'ask_report',
  'ask_vitals',
  'offer_checkup',
  'none'
])

const ACTIONABLE_TYPES = new Set<string>([
  'ask_goal',
  'choose_option',
  'offer_recommend',
  'ask_report',
  'ask_vitals',
  'offer_checkup'
])

/** Fallback goal chips when ask_goal has no/insufficient goal_codes (mirrors chat-turn-actions). */
const FALLBACK_GOAL_OPTIONS: ChatMessageOption[] = [
  { code: 'sleep', label: '睡眠' },
  { code: 'weight_loss', label: '減重' },
  { code: 'immune_boost', label: '免疫提升' },
  { code: 'cognitive_function', label: '認知功能' },
  { code: 'gastrointestinal', label: '腸胃道' }
]

const loggedUnknownTypes = new Set<string>()

function logUnknownTypeOnce(type: string) {
  if (loggedUnknownTypes.has(type)) {
    return
  }
  loggedUnknownTypes.add(type)
  if (import.meta.dev) {
    console.warn(`[reply_actions] unknown action type ignored: ${type}`)
  }
}

/** Reset unknown-type log set (tests). */
export function resetReplyActionsUnknownLog() {
  loggedUnknownTypes.clear()
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function asOptionList(raw: unknown): ChatMessageOption[] {
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

/**
 * Parse unknown JSON into ReplyActions, or null when absent / not an object.
 * Does not invent actions; keeps unknown action types for the caller to skip.
 */
export function parseReplyActions(raw: unknown): ReplyActions | null {
  if (raw === undefined || raw === null) {
    return null
  }
  if (!isRecord(raw)) {
    return null
  }
  const actionsRaw = raw.actions
  const actions: ReplyAction[] = Array.isArray(actionsRaw)
    ? actionsRaw.filter(isRecord).map((item) => {
        const payload = item.payload
        return {
          type: typeof item.type === 'string' ? item.type : '',
          payload: isRecord(payload) ? payload : (payload === null ? null : undefined)
        }
      }).filter(item => item.type !== '')
    : []

  return {
    schema_version: typeof raw.schema_version === 'string' ? raw.schema_version : undefined,
    source: typeof raw.source === 'string' ? raw.source : undefined,
    adaptor: typeof raw.adaptor === 'string' ? raw.adaptor : undefined,
    actions,
    degraded: raw.degraded === true,
    error: typeof raw.error === 'string' ? raw.error : (raw.error === null ? null : undefined)
  }
}

/**
 * Usable = present, not degraded, and has ≥1 known non-`none` action.
 * Empty / none-only / degraded → not usable → FE falls back to legacy meta.
 */
export function isUsableReplyActions(ra: ReplyActions | null | undefined): boolean {
  if (!ra || ra.degraded === true) {
    return false
  }
  const actions = Array.isArray(ra.actions) ? ra.actions : []
  if (actions.length === 0) {
    return false
  }
  return actions.some((action) => {
    if (!KNOWN_TYPES.has(action.type)) {
      logUnknownTypeOnce(action.type)
      return false
    }
    return ACTIONABLE_TYPES.has(action.type)
  })
}

/**
 * Required-gap interactive CTAs (hybrid intake).
 * Non-gap usable actions (offer_recommend / ask_report / offer_checkup) alone
 * must not keep the FE stuck on the latest bubble when an earlier bank turn
 * still carries ask_vitals / choose_option / ask_goal.
 */
export const GAP_CTA_ACTION_TYPES = new Set<string>([
  'ask_vitals',
  'choose_option',
  'ask_goal'
])

/** True when reply_actions is usable and includes ≥1 required-gap CTA. */
export function hasUsableGapCta(ra: ReplyActions | null | undefined): boolean {
  if (!isUsableReplyActions(ra)) {
    return false
  }
  return ra!.actions.some(action => GAP_CTA_ACTION_TYPES.has(action.type))
}

type GapCtaHostCandidate = {
  id: string
  role: string
  replyActions?: ReplyActions | null
}

/**
 * Walk newest→oldest assistant turns; return the first with a usable gap CTA.
 * When the latest stream turn only has offer_recommend (etc.), this recovers
 * the preceding bank message that still carries ask_vitals / choose_option.
 */
export function findGapCtaHostMessage<T extends GapCtaHostCandidate>(
  messages: T[]
): T | undefined {
  return [...messages].reverse().find(
    message => message.role === 'assistant' && hasUsableGapCta(message.replyActions)
  )
}

export function chooseOptionPayload(action: ReplyAction): ChooseOptionPayload {
  const p = isRecord(action.payload) ? action.payload : {}
  return {
    kind: typeof p.kind === 'string' ? p.kind : null,
    mode: typeof p.mode === 'string' ? p.mode : null,
    confirm: typeof p.confirm === 'boolean' ? p.confirm : null,
    options: asOptionList(p.options),
    selected: Array.isArray(p.selected)
      ? p.selected.filter((c): c is string => typeof c === 'string')
      : [],
    gap_code: typeof p.gap_code === 'string' ? p.gap_code : null,
    answer_type: typeof p.answer_type === 'string' ? p.answer_type : null,
    exclusive_codes: Array.isArray(p.exclusive_codes)
      ? p.exclusive_codes.filter((c): c is string => typeof c === 'string')
      : undefined
  }
}

export function askGoalPayload(action: ReplyAction): AskGoalPayload {
  const p = isRecord(action.payload) ? action.payload : {}
  return {
    goal_codes: Array.isArray(p.goal_codes)
      ? p.goal_codes.filter((c): c is string => typeof c === 'string')
      : null
  }
}

export function askVitalsPayload(action: ReplyAction): AskVitalsPayload {
  const p = isRecord(action.payload) ? action.payload : {}
  return {
    fields: asVitalsFields(p.fields),
    gap_code: typeof p.gap_code === 'string' ? p.gap_code : null
  }
}

export function offerCheckupPayload(action: ReplyAction): OfferCheckupPayload {
  const p = isRecord(action.payload) ? action.payload : {}
  return {
    url: typeof p.url === 'string' ? p.url : null
  }
}

function goalOptionsFromAskGoal(payload: AskGoalPayload): ChatMessageOption[] {
  const codes = payload.goal_codes
  if (!codes || codes.length === 0) {
    return FALLBACK_GOAL_OPTIONS
  }
  const byCode = new Map(FALLBACK_GOAL_OPTIONS.map(o => [o.code, o]))
  const mapped = codes.map(code => byCode.get(code) ?? { code, label: code })
  return mapped.length >= 2 ? mapped : FALLBACK_GOAL_OPTIONS
}

export interface ReplyActionsCtaFlags {
  choices: ChatMessageOption[]
  showConfirm: boolean
  showUpload: boolean
  showCheckup: boolean
  showSubmitReview: boolean
  showViewRecommend: boolean
}

export interface ReplyActionsCtaProjection {
  flags: ReplyActionsCtaFlags
  /** When choose_option drives chips. */
  chooseOption: ChooseOptionPayload | null
  /** ask_goal without consultation_goals choose_option. */
  askGoal: AskGoalPayload | null
  vitalsFields: VitalsField[]
  vitalsGapCode: string | null
  checkupUrlOverride: string | null
  /** Exclusive chip codes from choose_option (none / none_of_above). */
  exclusiveCodes: string[]
}

export interface ProjectReplyActionsInput {
  replyActions: ReplyActions
  /** Journey gates already applied for recommend slot. */
  canShowRecommendSlot: boolean
  canShowUpload: boolean
  canShowCheckup: boolean
  canShowVitals: boolean
  expertReviewStatus: 'none' | 'awaiting_review' | 'reviewed'
  /** `standard` (/chat-ai) → always view-recommend copy path. */
  flow?: 'standard'
}

/**
 * Project usable reply_actions into CTA flags.
 * Caller must only invoke when `isUsableReplyActions` is true.
 * Unknown types are skipped (logged once in dev); remaining actions still render.
 */
export function projectReplyActionsToCtas(input: ProjectReplyActionsInput): ReplyActionsCtaProjection {
  const actions = input.replyActions.actions.filter((action) => {
    if (!KNOWN_TYPES.has(action.type)) {
      logUnknownTypeOnce(action.type)
      return false
    }
    return action.type !== 'none'
  })

  const chooseActions = actions.filter(a => a.type === 'choose_option')
  const askGoalAction = actions.find(a => a.type === 'ask_goal')
  const hasRecommend = actions.some(a => a.type === 'offer_recommend')
  const hasReport = actions.some(a => a.type === 'ask_report')
  const vitalsAction = actions.find(a => a.type === 'ask_vitals')
  const checkupAction = actions.find(a => a.type === 'offer_checkup')

  let chooseOption: ChooseOptionPayload | null = null
  for (const action of chooseActions) {
    const payload = chooseOptionPayload(action)
    // Prefer consultation_goals when multiple choose_option appear.
    if (!chooseOption || payload.kind === 'consultation_goals') {
      chooseOption = payload
    }
  }

  const hasConsultationGoals = chooseOption?.kind === 'consultation_goals'
  const askGoal = askGoalAction && !hasConsultationGoals
    ? askGoalPayload(askGoalAction)
    : null

  let choices: ChatMessageOption[] = []
  let showConfirm = false

  if (chooseOption) {
    const answerType = chooseOption.answer_type
    const chipsHidden = chooseOption.kind === 'profile'
      && (answerType === 'int' || answerType === 'text')
    if (!chipsHidden) {
      choices = chooseOption.options ?? []
      const wantsConfirm = chooseOption.confirm === true
        || chooseOption.mode === 'multi'
        || chooseOption.kind === 'consultation_goals'
        || answerType === 'multi_enum'
      const singleNoConfirm = chooseOption.mode === 'single' && chooseOption.confirm !== true
      showConfirm = wantsConfirm && !singleNoConfirm && choices.length > 0
      if (chooseOption.confirm === true && choices.length > 0) {
        showConfirm = true
      }
    }
  } else if (askGoal) {
    choices = goalOptionsFromAskGoal(askGoal)
    showConfirm = choices.length > 0
  }

  const standardFlow = input.flow === 'standard'
  const showSubmitReview = hasRecommend
    && input.canShowRecommendSlot
    && !standardFlow
    && input.expertReviewStatus === 'none'
  const showViewRecommend = hasRecommend
    && input.canShowRecommendSlot
    && (standardFlow || input.expertReviewStatus === 'reviewed')

  const vitals = vitalsAction ? askVitalsPayload(vitalsAction) : null
  const vitalsFields = input.canShowVitals && vitals
    ? (vitals.fields && vitals.fields.length > 0
        ? vitals.fields
        : (['age', 'height', 'weight'] as VitalsField[]))
    : []
  const checkup = checkupAction ? offerCheckupPayload(checkupAction) : null

  return {
    flags: {
      choices,
      showConfirm,
      showUpload: hasReport && input.canShowUpload,
      showCheckup: Boolean(checkupAction) && input.canShowCheckup,
      showSubmitReview,
      showViewRecommend
    },
    chooseOption,
    askGoal,
    vitalsFields,
    vitalsGapCode: vitals?.gap_code ?? null,
    checkupUrlOverride: checkup?.url?.trim() || null,
    exclusiveCodes: chooseOption?.exclusive_codes?.length
      ? chooseOption.exclusive_codes
      : ['none', 'none_of_above']
  }
}

/** offer_recommend button copy by route (same backend type). */
export function offerRecommendLabelKey(flow?: 'standard'): 'chat.submitExpertReview' | 'chat.viewRecommend' {
  return flow === 'standard' ? 'chat.viewRecommend' : 'chat.submitExpertReview'
}
