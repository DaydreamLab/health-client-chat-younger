/**
 * Member notification inbox (v1) — UI types and helpers.
 * No core inbox API yet; shape is ready for a future list/mark-read contract.
 */

export const NOTIFICATIONS_DEMO_QUERY = 'demo'

export type NotificationsDemoMode = 'sample' | 'empty'

/** Wave-1 event kinds (domain actions → UI; not a frozen taxonomy). */
export type NotificationKind = 'expert_report_finalized' | 'member_welcome'

export type NotificationAccent = 'expert' | 'welcome'

export interface NotificationItem {
  id: string
  kind: NotificationKind
  /** ISO-8601 timestamp */
  createdAt: string
  read: boolean
  /** Demo / sample row (no deployed inbox API). */
  isSample?: boolean
}

export function parseNotificationsDemoMode(
  raw: string | null | undefined
): NotificationsDemoMode {
  if (raw === 'empty') {
    return 'empty'
  }
  return 'sample'
}

export function notificationAccent(kind: NotificationKind): NotificationAccent {
  return kind === 'expert_report_finalized' ? 'expert' : 'welcome'
}

/** Deep link after mark-read (no detail page in v1). */
export function notificationDeepLinkPath(kind: NotificationKind): string {
  switch (kind) {
    case 'expert_report_finalized':
      return '/app'
    case 'member_welcome':
      return '/app/me'
  }
}

export function formatUnreadBadgeLabel(count: number): string | undefined {
  if (count <= 0) {
    return undefined
  }
  return count > 99 ? '99+' : String(count)
}

const TAIPEI_TZ = 'Asia/Taipei'

function taipeiCalendarParts(date: Date): { y: number, m: number, d: number, time: string } {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: TAIPEI_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23'
  }).formatToParts(date)

  const pick = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find(part => part.type === type)?.value ?? '0'

  return {
    y: Number(pick('year')),
    m: Number(pick('month')),
    d: Number(pick('day')),
    time: `${pick('hour').padStart(2, '0')}:${pick('minute').padStart(2, '0')}`
  }
}

function taipeiDayNumber(y: number, m: number, d: number): number {
  // Civil day index in Taipei calendar (UTC noon; TW has no DST).
  return Math.floor(Date.UTC(y, m - 1, d, 12) / 86_400_000)
}

/**
 * Relative day label keys + optional clock for "today".
 * Callers resolve i18n; clock uses Asia/Taipei 24h HH:mm.
 */
export function notificationTimeParts(
  iso: string,
  now: Date = new Date()
): { key: 'today' | 'yesterday' | 'lastWeek' | 'older', time?: string, date?: string } {
  const at = new Date(iso)
  if (Number.isNaN(at.getTime())) {
    return { key: 'older', date: iso }
  }

  const atParts = taipeiCalendarParts(at)
  const nowParts = taipeiCalendarParts(now)
  const dayDiff = taipeiDayNumber(nowParts.y, nowParts.m, nowParts.d)
    - taipeiDayNumber(atParts.y, atParts.m, atParts.d)

  if (dayDiff === 0) {
    return { key: 'today', time: atParts.time }
  }
  if (dayDiff === 1) {
    return { key: 'yesterday' }
  }
  if (dayDiff > 1 && dayDiff < 7) {
    return { key: 'lastWeek' }
  }

  const m = String(atParts.m).padStart(2, '0')
  const d = String(atParts.d).padStart(2, '0')
  return { key: 'older', date: `${atParts.y}-${m}-${d}` }
}
