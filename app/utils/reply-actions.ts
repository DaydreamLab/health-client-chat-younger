/**
 * reply_actions v0.1 — parse, usable check, and CTA projection.
 * Contract: https://app.notion.com/p/3f2bb4588e818142be28c92e84ee39c5
 */

import type { OfferRecommendPayload } from './candor-api'
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
    /** 報告指標未達門檻 → 外連完整檢測（Body Decode）。 */
    | 'offer_full_test'
    /** 預約專家諮詢 → 導向 /expert-booking（goals 分流由 core 決策判讀）。 */
    | 'offer_expert_booking'
    | 'none'

export type ChooseOptionKind
  = 'consultation_goals'
    | 'profile'
    | 'free'
    | 'lab_followup'
    /** Required ask for report chips (mirrors consultation_goals / ask_goal; not a profile gap). */
    | 'lab_report'
    /** Switch conversation entry path (A→B guide, C→A／C→B). */
    | 'path_switch'
    /** POST …/continue-health-consultation (completion 組第二鈕). */
    | 'continue_consultation'

/** choose_option option.maps_to → FE route (LabFollowup chips). */
export type ChooseOptionMapsTo = 'ask_report' | 'offer_checkup' | 'continue_consultation'

export function normalizeChooseOptionMapsTo(raw: string | null | undefined): ChooseOptionMapsTo | null {
  if (raw === 'ask_report' || raw === 'offer_checkup' || raw === 'continue_consultation') {
    return raw
  }
  // Tolerant aliases from catalog / copy variants.
  if (raw === 'upload' || raw === 'ask_upload') {
    return 'ask_report'
  }
  if (raw === 'go_checkup' || raw === 'checkup') {
    return 'offer_checkup'
  }
  return null
}

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

/**
 * offer_full_test — 外連完整 136 項檢測（對齊 offer_checkup 的 payload.url）。
 * label／copy 可由 ConversationCopy／CTA 型錄帶入；缺省走 FE i18n。
 * marker_count（或別名 n）供 i18n「{n} 項指標」回填。
 */
export interface OfferFullTestPayload {
  url?: string | null
  label?: string | null
  copy?: string | null
  marker_count?: number | null
}

/**
 * offer_expert_booking — 對話結尾「預約專家諮詢」CTA（core PR #155）。
 * payload 目前依既有 offer_* 慣例支援 path／label；缺省走 FE 路由與 i18n。
 * 若 OpenAPI OfferExpertBookingPayload 欄位不同需再對齊（本環境無法讀 core private repo）。
 */
export interface OfferExpertBookingPayload {
  path?: string | null
  label?: string | null
}

/** 後台未設網址時的 Body Decode 預設外連。 */
export const OFFER_FULL_TEST_DEFAULT_URL = 'https://www.younger.tw/products/body-decode'

/** 預約專家預設路徑（C11）。 */
export const OFFER_EXPERT_BOOKING_DEFAULT_PATH = '/expert-booking'

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
  'offer_full_test',
  'offer_expert_booking',
  'none'
])

const ACTIONABLE_TYPES = new Set<string>([
  'ask_goal',
  'choose_option',
  'offer_recommend',
  'ask_report',
  'ask_vitals',
  'offer_checkup',
  'offer_full_test',
  'offer_expert_booking'
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
    if (!code) {
      continue
    }
    // Keep empty string (path_switch: BE omits copy; FE i18n fills display).
    // Missing label field still falls back to code for other choose_option kinds.
    const label = typeof item.label === 'string' ? item.label : code
    const mapsTo = typeof item.maps_to === 'string' ? item.maps_to : null
    out.push(mapsTo ? { code, label, maps_to: mapsTo } : { code, label })
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
 * Empty / none-only / degraded → not usable. FE must **not** invent legacy CTAs
 * (upload_offer / journey recommend); intentional `none` = no bubble CTAs.
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
 * True when the reply_actions column is present on the message (incl. none /
 * degraded / empty). Distinct from usable: present-but-empty must paint no CTAs
 * and must not fall back to legacy meta.
 */
export function hasReplyActionsColumn(ra: ReplyActions | null | undefined): boolean {
  return ra != null
}

/** True when usable RA includes ask_report (required ask, mirrors ask_goal). */
export function hasAskReportAction(ra: ReplyActions | null | undefined): boolean {
  if (!isUsableReplyActions(ra)) {
    return false
  }
  return ra!.actions.some(action => action.type === 'ask_report')
}

/**
 * Report required-ask surface: `ask_report` or `choose_option.kind=lab_report`
 * (core #100; same pattern as ask_goal / consultation_goals).
 */
export function hasReportRequiredAsk(ra: ReplyActions | null | undefined): boolean {
  if (!isUsableReplyActions(ra)) {
    return false
  }
  return ra!.actions.some((action) => {
    if (action.type === 'ask_report') {
      return true
    }
    if (action.type !== 'choose_option') {
      return false
    }
    const payload = chooseOptionPayload(action)
    return payload.kind === 'lab_report' || payload.gap_code === 'lab_report'
  })
}

/**
 * Profile-gap interactive CTAs (hybrid intake).
 * Required asks `ask_goal` / `ask_report` are **not** profile gaps (goal／report
 * 必問, 對齊 goal 設計). Used for open-gap discovery (follow-up skip); UI no
 * longer lifts these CTAs onto a later bubble.
 */
export const GAP_CTA_ACTION_TYPES = new Set<string>([
  'ask_vitals',
  'choose_option'
])

/** choose_option kinds that are not profile-gap hosts (show on latest bubble). */
export const NON_GAP_CHOOSE_OPTION_KINDS = new Set<string>([
  'free',
  'lab_followup',
  'consultation_goals',
  // core #100: report 必問 chips（同 ask_goal 模式），不進 open profile gap host
  'lab_report',
  'path_switch',
  'continue_consultation',
  // System One asking fallback (continue / no-more-questions); not profile gap host.
  'open_question_reply'
])

/**
 * Path-rule short-circuit signatures (empty content; FE fills i18n).
 * - path_a_cap: offer_checkup + path_switch (A 引導／上限；文案以 core content 為準)
 * - path_c_await_upload: ask_report + path_switch（PR6 無 checkup）
 */
export type PathRuleCopyKind = 'path_a_cap' | 'path_c_await_upload'

export function detectPathRuleCopyKind(
  ra: ReplyActions | null | undefined
): PathRuleCopyKind | null {
  if (!isUsableReplyActions(ra)) {
    return null
  }
  const actions = ra!.actions
  const hasPathSwitch = actions.some(
    action => action.type === 'choose_option'
      && chooseOptionPayload(action).kind === 'path_switch'
  )
  if (!hasPathSwitch) {
    return null
  }
  if (actions.some(action => action.type === 'ask_report')) {
    return 'path_c_await_upload'
  }
  if (actions.some(action => action.type === 'offer_checkup')) {
    return 'path_a_cap'
  }
  return null
}

export function pathRuleBubbleI18nKey(kind: PathRuleCopyKind): string {
  return kind === 'path_c_await_upload'
    ? 'chat.pathCAwaitUpload'
    : 'chat.pathACap'
}

/** path_switch chip label fallback when BE omits option label (A→B guide／C await). */
export function pathSwitchChipI18nKey(kind: PathRuleCopyKind): string {
  // Reuse pathSwitchToConsult — same zh／en as former pathEntryB; entry chips use core labels.
  void kind
  return 'chat.pathSwitchToConsult'
}

/**
 * Per-option i18n for path_switch when BE label is empty.
 * Path C a／b／c → pathEntry*; Path A guide `b` → pathSwitchToConsult.
 */
export function pathSwitchOptionI18nKey(kind: PathRuleCopyKind, code: string): string {
  const normalized = code.trim().toLowerCase()
  if (kind === 'path_c_await_upload') {
    if (normalized === 'a') {
      return 'chat.pathEntryA'
    }
    if (normalized === 'c') {
      return 'chat.pathEntryC'
    }
    return 'chat.pathEntryB'
  }
  if (normalized === 'a') {
    return 'chat.pathEntryA'
  }
  if (normalized === 'c') {
    return 'chat.pathEntryC'
  }
  return 'chat.pathSwitchToConsult'
}

/**
 * True when BE omitted chip copy: empty label, or parser fell back to code.
 * Non-empty distinct labels from core win (existing priority).
 */
export function pathSwitchLabelNeedsI18n(
  option: { code: string, label?: string | null }
): boolean {
  const label = String(option.label ?? '').trim()
  return label === '' || label === option.code
}

/** Fill empty path_switch chip labels via existing i18n keys (no new copy). */
export function resolvePathSwitchChoiceLabels(
  ra: ReplyActions | null | undefined,
  choices: ChatMessageOption[],
  translate: (key: string) => string
): ChatMessageOption[] {
  const kind = detectPathRuleCopyKind(ra)
  if (!kind) {
    return choices
  }
  return choices.map((option) => {
    if (!isPathSwitchOptionCode(ra, option.code)) {
      return option
    }
    if (!pathSwitchLabelNeedsI18n(option)) {
      return option
    }
    return {
      ...option,
      label: translate(pathSwitchOptionI18nKey(kind, option.code))
    }
  })
}

export function isContinueConsultationOption(
  ra: ReplyActions | null | undefined,
  code: string
): boolean {
  if (!isUsableReplyActions(ra)) {
    return false
  }
  return ra!.actions.some((action) => {
    if (action.type !== 'choose_option') {
      return false
    }
    const payload = chooseOptionPayload(action)
    if (payload.kind !== 'continue_consultation') {
      return false
    }
    return (payload.options ?? []).some(option => option.code === code)
  })
}

export function isPathSwitchOptionCode(
  ra: ReplyActions | null | undefined,
  code: string
): boolean {
  if (!isUsableReplyActions(ra)) {
    return false
  }
  return ra!.actions.some((action) => {
    if (action.type !== 'choose_option') {
      return false
    }
    const payload = chooseOptionPayload(action)
    if (payload.kind !== 'path_switch') {
      return false
    }
    return (payload.options ?? []).some(option => option.code === code)
  })
}

/** True when reply_actions is usable and includes ≥1 required-gap CTA. */
export function hasUsableGapCta(
  ra: ReplyActions | null | undefined,
  openProfileGaps?: readonly string[]
): boolean {
  if (!isUsableReplyActions(ra)) {
    return false
  }
  return ra!.actions.some(action => isOpenGapCtaAction(action, openProfileGaps))
}

/**
 * Whether a gap-type action still needs an answer given current open profile gaps.
 *
 * When `openProfileGaps` is omitted, any ask_vitals / profile choose_option counts
 * (hydrate / host discovery). When provided (incl. empty):
 * - profile `choose_option` / `ask_vitals` only if their gap_code (or vitals field) is open
 * - `kind=lab_followup` / `free` / `consultation_goals` / `path_switch` never count as profile gaps
 * - `gap_code=lab_report` never counts (report is required ask like goal, not a gap)
 * - `ask_goal` / `ask_report` are not gap CTAs
 */
export function isOpenGapCtaAction(
  action: ReplyAction,
  openProfileGaps?: readonly string[]
): boolean {
  if (!GAP_CTA_ACTION_TYPES.has(action.type)) {
    return false
  }
  if (action.type === 'choose_option') {
    const payload = chooseOptionPayload(action)
    if (payload.kind && NON_GAP_CHOOSE_OPTION_KINDS.has(payload.kind)) {
      return false
    }
    // Report 必問（對齊 goal），不再當 profile gap chips host。
    if (payload.gap_code === 'lab_report') {
      return false
    }
    if (openProfileGaps === undefined) {
      return Boolean(payload.kind === 'profile' || payload.gap_code)
    }
    if (payload.kind === 'profile' || payload.gap_code) {
      return Boolean(payload.gap_code && openProfileGaps.includes(payload.gap_code))
    }
    return false
  }
  if (action.type === 'ask_vitals') {
    if (openProfileGaps === undefined) {
      return true
    }
    const payload = askVitalsPayload(action)
    if (payload.gap_code) {
      return openProfileGaps.includes(payload.gap_code)
    }
    const fields = payload.fields ?? []
    return fields.some(field => openProfileGaps.includes(field))
  }
  return false
}

/** True when choose_option chips belong on the message that carries them (not gap-host-only). */
export function isNonGapChooseOption(action: ReplyAction): boolean {
  if (action.type !== 'choose_option') {
    return false
  }
  const payload = chooseOptionPayload(action)
  if (payload.kind === 'lab_report' || payload.gap_code === 'lab_report') {
    return true
  }
  return Boolean(payload.kind && NON_GAP_CHOOSE_OPTION_KINDS.has(payload.kind))
}

type GapCtaHostCandidate = {
  id: string
  role: string
  replyActions?: ReplyActions | null
}

export type FindGapCtaHostOptions = {
  /** When set, ignore answered profile gaps / lab_followup still present on hydrate. */
  openProfileGaps?: readonly string[]
}

/**
 * Walk newest→oldest assistant turns; return the first with a usable profile-gap
 * CTA (ask_vitals / profile choose_option; not ask_goal / ask_report / lab_report).
 * Used for follow-up-stream skip / vitals host discovery — **not** to lift old
 * unanswered chips onto the latest bubble (Irice 2026-11-04: latest shows own RA only).
 */
export function findGapCtaHostMessage<T extends GapCtaHostCandidate>(
  messages: T[],
  options?: FindGapCtaHostOptions
): T | undefined {
  const openGaps = options?.openProfileGaps
  return [...messages].reverse().find(
    message => message.role === 'assistant' && hasUsableGapCta(message.replyActions, openGaps)
  )
}

/**
 * Latest assistant already holds unanswered lab_report bank or lab_followup chips.
 * (kind=profile + gap_code=lab_report is stale／answered shape — does not count.)
 */
export function hasLabReportBankOrFollowup(ra: ReplyActions | null | undefined): boolean {
  if (!isUsableReplyActions(ra)) {
    return false
  }
  return ra!.actions.some((action) => {
    if (action.type === 'ask_report') {
      return true
    }
    if (action.type !== 'choose_option') {
      return false
    }
    const payload = chooseOptionPayload(action)
    return payload.kind === 'lab_report' || payload.kind === 'lab_followup'
  })
}

/**
 * After POST /profile/answers (or goals): whether FE may skip the follow-up stream.
 * Skip when history already has an open profile-gap CTA, unanswered lab_report bank,
 * or lab_followup. Do not force-stream solely because next_question.done — that covered
 * the lab bank turn with a free-chat summary.
 */
export function shouldSkipFollowUpStream(input: {
  nextQuestionDone?: boolean
  openProfileGaps: readonly string[]
  messages: GapCtaHostCandidate[]
}): boolean {
  const latestAssistant = [...input.messages].reverse().find(message => message.role === 'assistant')
  if (latestAssistant && hasLabReportBankOrFollowup(latestAssistant.replyActions)) {
    return true
  }
  const openGaps = input.openProfileGaps
  if (hasUsableGapCta(
    findGapCtaHostMessage(input.messages, { openProfileGaps: openGaps })?.replyActions,
    openGaps
  )) {
    return true
  }
  // next_question.done with no bank CTA → allow stream (status summary / open chat).
  void input.nextQuestionDone
  return false
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

function asNonNegativeInt(raw: unknown): number | null {
  if (typeof raw === 'number' && Number.isFinite(raw) && raw >= 0) {
    return Math.floor(raw)
  }
  if (typeof raw === 'string' && raw.trim() !== '') {
    const parsed = Number(raw)
    if (Number.isFinite(parsed) && parsed >= 0) {
      return Math.floor(parsed)
    }
  }
  return null
}

export function offerFullTestPayload(action: ReplyAction): OfferFullTestPayload {
  const p = isRecord(action.payload) ? action.payload : {}
  const markerCount = asNonNegativeInt(p.marker_count) ?? asNonNegativeInt(p.n)
  return {
    url: typeof p.url === 'string' ? p.url : null,
    label: typeof p.label === 'string' ? p.label : null,
    copy: typeof p.copy === 'string' ? p.copy : null,
    marker_count: markerCount
  }
}

export function offerExpertBookingPayload(action: ReplyAction): OfferExpertBookingPayload {
  const p = isRecord(action.payload) ? action.payload : {}
  return {
    path: typeof p.path === 'string' ? p.path : null,
    label: typeof p.label === 'string' ? p.label : null
  }
}

/** Parse spec 33 `offer_recommend` payload; ignores unknown modes (e.g. legacy dual_choice). */
export function offerRecommendPayload(action: ReplyAction): Partial<OfferRecommendPayload> {
  const p = isRecord(action.payload) ? action.payload : {}
  const mode = p.mode === 'view_recommendations' ? 'view_recommendations' as const : undefined
  return {
    ...(mode ? { mode } : {}),
    ...(typeof p.label === 'string' ? { label: p.label } : {}),
    ...(typeof p.path === 'string' ? { path: p.path } : {})
  }
}

export function isViewRecommendationsOfferAction(action: ReplyAction): boolean {
  if (action.type !== 'offer_recommend') {
    return false
  }
  const payload = isRecord(action.payload) ? action.payload : {}
  if (payload.mode === 'dual_choice') {
    return false
  }
  return payload.mode === 'view_recommendations'
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
  showFullTest: boolean
  /** offer_expert_booking — 預約專家諮詢（goals 分流由 core 決定）。 */
  showExpertBooking: boolean
  showSubmitReview: boolean
  showViewRecommend: boolean
}

export interface ReplyActionsCtaProjection {
  flags: ReplyActionsCtaFlags
  /** When choose_option drives chips. */
  chooseOption: ChooseOptionPayload | null
  /**
   * path_switch payload when present.
   * When another choose_option is primary, chips are still appended to `flags.choices`
   * so the switch CTA coexists (e.g. open_question_reply + path_switch).
   */
  pathSwitch: ChooseOptionPayload | null
  /**
   * continue_consultation payload when present.
   * Coexists with open_question_reply／other chips (B／C triad summary); click still
   * streams the label so core prepareTurn opens continue_health_consultation.
   */
  continueConsultation: ChooseOptionPayload | null
  /** ask_goal without consultation_goals choose_option. */
  askGoal: AskGoalPayload | null
  vitalsFields: VitalsField[]
  vitalsGapCode: string | null
  checkupUrlOverride: string | null
  /** offer_full_test payload.url when set; else OFFER_FULL_TEST_DEFAULT_URL. */
  fullTestUrlOverride: string | null
  /** Backend button label; empty → FE i18n chat.offerFullTest. */
  fullTestLabelOverride: string | null
  /** Backend suggestion copy; empty → FE i18n with marker_count. */
  fullTestCopyOverride: string | null
  /** Parsed marker count N for i18n fallback (incl. 0). */
  fullTestMarkerCount: number | null
  /** offer_expert_booking payload.path when set; else OFFER_EXPERT_BOOKING_DEFAULT_PATH. */
  expertBookingPathOverride: string | null
  /** Backend button label; empty → FE i18n chat.expertBooking. */
  expertBookingLabelOverride: string | null
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
  const hasRecommend = actions.some(isViewRecommendationsOfferAction)
  const hasReport = actions.some(a => a.type === 'ask_report')
  const vitalsAction = actions.find(a => a.type === 'ask_vitals')
  const checkupAction = actions.find(a => a.type === 'offer_checkup')
  const fullTestAction = actions.find(a => a.type === 'offer_full_test')
  const expertBookingAction = actions.find(a => a.type === 'offer_expert_booking')

  // path_switch／continue_consultation may coexist with open_question_reply／goals／…
  // Keep them out of the primary pick so they cannot hide other chips; append later.
  let chooseOption: ChooseOptionPayload | null = null
  let pathSwitch: ChooseOptionPayload | null = null
  let continueConsultation: ChooseOptionPayload | null = null
  for (const action of chooseActions) {
    const payload = chooseOptionPayload(action)
    if (payload.kind === 'path_switch') {
      pathSwitch = payload
      continue
    }
    if (payload.kind === 'continue_consultation') {
      continueConsultation = payload
      continue
    }
    // Prefer consultation_goals when multiple choose_option appear.
    if (!chooseOption || payload.kind === 'consultation_goals') {
      chooseOption = payload
    }
  }
  // Solo companion (no other choose_option) remains the primary chip host.
  if (!chooseOption && pathSwitch) {
    chooseOption = pathSwitch
  }
  if (!chooseOption && continueConsultation) {
    chooseOption = continueConsultation
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
      if (chooseOption.kind === 'continue_consultation') {
        choices = stampContinueConsultationMapsTo(choices)
      }
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

  // Companion path_switch: extra switch chip(s) beside the primary choose_option.
  if (pathSwitch && chooseOption?.kind !== 'path_switch') {
    const seen = new Set(choices.map(option => option.code))
    for (const option of pathSwitch.options ?? []) {
      if (seen.has(option.code)) {
        continue
      }
      seen.add(option.code)
      choices = [...choices, option]
    }
  }

  // Companion continue_consultation: triad summary「繼續健康諮詢」beside open_question_reply.
  if (continueConsultation && chooseOption?.kind !== 'continue_consultation') {
    const seen = new Set(choices.map(option => option.code))
    for (const option of stampContinueConsultationMapsTo(continueConsultation.options ?? [])) {
      if (seen.has(option.code)) {
        continue
      }
      seen.add(option.code)
      choices = [...choices, option]
    }
  }

  const showSubmitReview = false
  const showViewRecommend = hasRecommend && input.canShowRecommendSlot

  const vitals = vitalsAction ? askVitalsPayload(vitalsAction) : null
  const vitalsFields = input.canShowVitals && vitals
    ? (vitals.fields && vitals.fields.length > 0
        ? vitals.fields
        : (['age', 'height', 'weight'] as VitalsField[]))
    : []
  const checkup = checkupAction ? offerCheckupPayload(checkupAction) : null
  const fullTest = fullTestAction ? offerFullTestPayload(fullTestAction) : null
  const fullTestUrl = fullTest?.url?.trim() || null
  const expertBooking = expertBookingAction
    ? offerExpertBookingPayload(expertBookingAction)
    : null
  const expertBookingPath = expertBooking?.path?.trim() || null

  return {
    flags: {
      choices,
      showConfirm,
      showUpload: hasReport && input.canShowUpload,
      showCheckup: Boolean(checkupAction) && input.canShowCheckup,
      // 出不出由 core 決定；FE 有 action 就畫（URL 缺省走預設 Body Decode）。
      showFullTest: Boolean(fullTestAction),
      // goals 含減重／腸胃道時 core 只出此 CTA（C10）；FE 不自行合成。
      showExpertBooking: Boolean(expertBookingAction),
      showSubmitReview,
      showViewRecommend
    },
    chooseOption,
    pathSwitch,
    continueConsultation,
    askGoal,
    vitalsFields,
    vitalsGapCode: vitals?.gap_code ?? null,
    checkupUrlOverride: checkup?.url?.trim() || null,
    fullTestUrlOverride: fullTestUrl || (fullTestAction ? OFFER_FULL_TEST_DEFAULT_URL : null),
    fullTestLabelOverride: fullTest?.label?.trim() || null,
    fullTestCopyOverride: fullTest?.copy?.trim() || null,
    fullTestMarkerCount: fullTest?.marker_count ?? null,
    expertBookingPathOverride: expertBookingPath
      || (expertBookingAction ? OFFER_EXPERT_BOOKING_DEFAULT_PATH : null),
    expertBookingLabelOverride: expertBooking?.label?.trim() || null,
    exclusiveCodes: chooseOption?.exclusive_codes?.length
      ? chooseOption.exclusive_codes
      : ['none', 'none_of_above']
  }
}

/** Stamp maps_to so FE checkup continue CTA does not duplicate RA continue chips. */
function stampContinueConsultationMapsTo(
  options: ChatMessageOption[]
): ChatMessageOption[] {
  return options.map((option) => {
    if (normalizeChooseOptionMapsTo(option.maps_to) === 'continue_consultation') {
      return option
    }
    return { ...option, maps_to: 'continue_consultation' }
  })
}

/** offer_recommend bubble CTA copy (v4: always view recommendations). */
export function offerRecommendLabelKey(_flow?: 'standard'): 'chat.viewRecommend' {
  return 'chat.viewRecommend'
}

/**
 * i18n key for FE-appended continue CTA on checkup suggestion turns.
 * Must match core copy `option.continue_health_consultation` so stream body
 * triggers prepareTurn same-turn `continue_health_consultation` (spec 16).
 */
export const CONTINUE_CONSULT_I18N_KEY = 'chat.continueConsult' as const

/**
 * True when TurnActions is painting checkup-suggestion CTAs:
 * (a) lab_followup chips (option.maps_to → ask_report / offer_checkup), or
 * (b) top-level ask_report + offer_checkup buttons (showUpload && showCheckup).
 * Single flag → at most one continue CTA even when (a)+(b) both present.
 * Every path shows it. Skip when the payload already has a continue chip.
 */
export function shouldShowContinueConsultCta(input: {
  showUpload: boolean
  showCheckup: boolean
  choices: readonly { maps_to?: string | null }[]
}): boolean {
  const alreadyInChoices = input.choices.some(
    choice => normalizeChooseOptionMapsTo(choice.maps_to) === 'continue_consultation'
  )
  if (alreadyInChoices) {
    return false
  }
  if (input.showUpload && input.showCheckup) {
    return true
  }
  return input.choices.some((choice) => {
    const mapsTo = normalizeChooseOptionMapsTo(choice.maps_to)
    return mapsTo === 'ask_report' || mapsTo === 'offer_checkup'
  })
}
