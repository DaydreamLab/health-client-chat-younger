/**
 * Conversation path contract (A / B / C) — client rules aligned with Irice 定案.
 *
 * 進站三選在 POST /conversations 時寫入 path（勿先建再改；B→A 不允許）。
 * Path A 回合計數與引導 CTA 在 core：≥15 引導、20 上限（`chat_turn_count`）。
 * FE 渲染 `reply_actions` 與 assistant `content`，不計回合、不自造引導鈕。
 * Path C 待上傳：`flow_prompt`＋`ask_report`＋`path_switch` a／b（無 checkup）。
 *
 * Completion CTA (offer_recommend /「取得專屬保健品方案」):
 * - Path A: never
 * - Path B／C: 僅在 usable `reply_actions` 含 `offer_recommend` 時投影（core `completion_cta_ready`）
 * - ❌ FE 不以本地基本四欄／profile_gaps 再挡或強掛
 */

export type ConversationPath = 'A' | 'B' | 'C'

/** Entry chips after welcome (進站三選). */
export type PathEntryCode = ConversationPath

export const PATH_ENTRY_CODES: readonly PathEntryCode[] = ['A', 'B', 'C'] as const

/**
 * Required basic profile gap codes (only these block completion CTA).
 * Optional profile fields + goals never block.
 */
export const REQUIRED_BASIC_PROFILE_GAPS = [
  'sex',
  'age',
  'height',
  'weight'
] as const

export type RequiredBasicProfileGap = (typeof REQUIRED_BASIC_PROFILE_GAPS)[number]

/** Runtime feature flag key (`nuxt.config` public.pathContract). */
export const PATH_CONTRACT_FLAG = 'pathContract'

export function isConversationPath(value: unknown): value is ConversationPath {
  return value === 'A' || value === 'B' || value === 'C'
}

/**
 * Accept core API lowercase `a|b|c` or FE `A|B|C`.
 */
export function normalizeConversationPath(value: unknown): ConversationPath | null {
  if (typeof value !== 'string' || value.trim() === '') {
    return null
  }
  const upper = value.trim().toUpperCase()
  return isConversationPath(upper) ? upper : null
}

/** Wire path into POST /conversations and POST …/path (core stores lowercase). */
export function toApiConversationPath(path: ConversationPath): 'a' | 'b' | 'c' {
  return path.toLowerCase() as 'a' | 'b' | 'c'
}

function normalizeGapCode(gap: string): string {
  const normalized = String(gap).trim().toLowerCase()
  if (normalized === 'age_years') {
    return 'age'
  }
  return normalized
}

/**
 * Basic profile complete when none of the required gap codes remain open.
 * Unknown / optional gaps (e.g. diet) are ignored for the completion gate.
 */
export function isBasicProfileComplete(
  openProfileGaps: readonly string[] | null | undefined
): boolean {
  const open = new Set(
    (openProfileGaps ?? [])
      .map(normalizeGapCode)
      .filter(Boolean)
  )
  return REQUIRED_BASIC_PROFILE_GAPS.every(gap => !open.has(gap))
}

/** Open required basic gaps only (filters out optional like diet). */
export function openRequiredBasicGaps(
  openProfileGaps: readonly string[] | null | undefined
): RequiredBasicProfileGap[] {
  const open = new Set(
    (openProfileGaps ?? [])
      .map(normalizeGapCode)
      .filter(Boolean)
  )
  return REQUIRED_BASIC_PROFILE_GAPS.filter(gap => open.has(gap))
}

/** Whether a gap_code is one of the four required basics. */
export function isRequiredBasicGapCode(gapCode: string | null | undefined): boolean {
  if (!gapCode) {
    return false
  }
  const normalized = normalizeGapCode(gapCode)
  return (REQUIRED_BASIC_PROFILE_GAPS as readonly string[]).includes(normalized)
}

/**
 * Path B／C must collect the four required basics (ask until complete).
 * Path A may collect opportunistically but does not gate completion CTA.
 */
export function pathRequiresBasicProfile(
  path: ConversationPath | null | undefined
): boolean {
  return path === 'B' || path === 'C'
}

/** Completion CTA allowed only on B／C with basic four fields filled. */
export function completionCtaPathAllows(path: ConversationPath | null | undefined): boolean {
  return path === 'B' || path === 'C'
}

/**
 * Journey safety for completion CTA slot (latest assistant, not pending, …).
 * Does **not** re-apply completion_cta_ready — core only emits offer_recommend when ready.
 * Still blocks while an active *required* profile question is on the latest bubble.
 */
export function completionCtaJourneyAllows(input: {
  readonlyMode: boolean
  escalated: boolean
  isLatestAssistant: boolean
  reportRetry: boolean
  pending?: boolean
  /** Active required basic profile question on this bubble. */
  requiredProfileQuestionActive?: boolean
}): boolean {
  return !input.readonlyMode
    && !input.escalated
    && input.isLatestAssistant
    && !input.reportRetry
    && !input.pending
    && !input.requiredProfileQuestionActive
}

export function completionCtaThresholdMet(input: {
  path: ConversationPath | null | undefined
  basicProfileComplete: boolean
}): boolean {
  void input.basicProfileComplete
  return completionCtaPathAllows(input.path)
}

/**
 * Full FE gate for *allowing* completion CTA when usable RA has offer_recommend.
 * Does not invent the button — callers still require usable offer_recommend.
 */
export function completionCtaVisible(input: {
  path: ConversationPath | null | undefined
  basicProfileComplete: boolean
  readonlyMode: boolean
  escalated: boolean
  isLatestAssistant: boolean
  reportRetry: boolean
  pending?: boolean
  requiredProfileQuestionActive?: boolean
}): boolean {
  return completionCtaThresholdMet(input) && completionCtaJourneyAllows(input)
}

/**
 * Promote any path to C on report upload (Dock or chat attach).
 * Returns the next path (always C when a report is bound).
 */
export function pathAfterReportUpload(
  _current: ConversationPath | null | undefined
): ConversationPath {
  return 'C'
}

/**
 * Path C: user taps path_switch → POST …/path (C→A or C→B). No auto demote on skip.
 */
export function pathAfterCancelUploadWithoutReport(
  current: ConversationPath | null | undefined,
  hasReport: boolean
): ConversationPath | null {
  void current
  void hasReport
  return null
}

/** Whether bubble should hide upload／checkup while lab_report quiz is open. */
export function shouldSuppressGuidanceCtas(input: {
  labReportQuizActive: boolean
}): boolean {
  return input.labReportQuizActive
}

export interface PathEntryOption {
  code: PathEntryCode
  /** i18n key under `chat.pathEntry*` */
  labelKey: string
}

export const PATH_ENTRY_OPTIONS: readonly PathEntryOption[] = [
  { code: 'A', labelKey: 'chat.pathEntryA' },
  { code: 'B', labelKey: 'chat.pathEntryB' },
  { code: 'C', labelKey: 'chat.pathEntryC' }
] as const
