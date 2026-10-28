/**
 * Conversation path contract (A / B / C) — client rules aligned with Irice 定案.
 *
 * Backend candor-core path API may land in parallel; FE keeps an extensible
 * client contract + local journey state. When core exposes path fields /
 * endpoints, wire `setConversationPath` without changing UI gates.
 *
 * Completion CTA (offer_recommend /「取得專屬保健品方案」):
 * - Path A: never
 * - Path B／C + basic profile (sex／age／height／weight) complete: may show
 *   when usable reply_actions includes offer_recommend（後端硬掛則照常渲染）
 * - ❌ FE 不在 intentional none／degraded／缺 RA 時強掛完成 CTA
 * - goals／報告／optional profile 不挡完成 CTA
 * - Path B／C 必須把基本四欄問出／收齊（舊「三要件全清 profile」拿掉）
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

/** Path A soft guide (checkup｜轉 B) after this many user↔assistant turns. */
export const PATH_A_SOFT_GUIDE_TURNS = 15

/** Path A hard redirect: fixed reply, only switch to B. */
export const PATH_A_HARD_REDIRECT_TURNS = 25

/** Runtime feature flag key (`nuxt.config` public.pathContract). */
export const PATH_CONTRACT_FLAG = 'pathContract'

export function isConversationPath(value: unknown): value is ConversationPath {
  return value === 'A' || value === 'B' || value === 'C'
}

export function normalizeConversationPath(value: unknown): ConversationPath | null {
  return isConversationPath(value) ? value : null
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
 * Does **not** block on goals or report ask (Irice: goals／報告不挡).
 * Still blocks while an active *required* profile question is on the latest
 * bubble so the user can finish sex／age／height／weight first.
 * Optional profile questions do **not** block.
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
  return completionCtaPathAllows(input.path) && input.basicProfileComplete
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

/** Count one user message + following assistant as one turn pair. */
export function countPathATurnPairs(
  messages: readonly { role: string }[]
): number {
  let pairs = 0
  let sawUser = false
  for (const message of messages) {
    if (message.role === 'user') {
      sawUser = true
      continue
    }
    if (message.role === 'assistant' && sawUser) {
      pairs += 1
      sawUser = false
    }
  }
  return pairs
}

export function pathASoftGuideDue(turnPairs: number): boolean {
  return turnPairs >= PATH_A_SOFT_GUIDE_TURNS
}

export function pathAHardRedirectDue(turnPairs: number): boolean {
  return turnPairs >= PATH_A_HARD_REDIRECT_TURNS
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
 * Path C: user cancels／skips upload without a report → demote to B.
 */
export function pathAfterCancelUploadWithoutReport(
  current: ConversationPath | null | undefined,
  hasReport: boolean
): ConversationPath | null {
  if (hasReport) {
    return current ?? null
  }
  if (current === 'C') {
    return 'B'
  }
  return current ?? null
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
