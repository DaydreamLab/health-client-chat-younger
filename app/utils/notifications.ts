/**
 * Member notification inbox (v1) — UI types and helpers.
 * Wired to candor-core member inbox APIs (list / unread-count / mark-read).
 */

/** Wave-1 inbox event types from core enqueue. */
export type NotificationType = 'member_registered' | 'expert_review_completed'

export type NotificationAccent = 'expert' | 'welcome'

export interface NotificationItem {
  id: string
  type: NotificationType | string
  title: string
  body: string
  /** ISO-8601 timestamp */
  createdAt: string
  read: boolean
  /** App-relative path from API (e.g. `/app/me`). */
  deepLink: string
}

export function notificationAccent(type: string): NotificationAccent {
  return type === 'expert_review_completed' ? 'expert' : 'welcome'
}

/** Fallback deep link when API omits `deep_link`. */
export function notificationDeepLinkFallback(type: string): string {
  switch (type) {
    case 'expert_review_completed':
      return '/app'
    case 'member_registered':
      return '/app/me'
    default:
      return '/app/notifications'
  }
}

/**
 * Normalize API deep_link to an in-app path.
 * Rejects absolute external URLs; empty → type fallback.
 */
export function resolveNotificationDeepLink(
  deepLink: string | null | undefined,
  type: string
): string {
  const raw = typeof deepLink === 'string' ? deepLink.trim() : ''
  if (!raw) {
    return notificationDeepLinkFallback(type)
  }
  if (/^https?:\/\//i.test(raw) || raw.startsWith('//')) {
    try {
      const url = new URL(raw, 'https://candor.invalid')
      if (url.pathname.startsWith('/')) {
        return `${url.pathname}${url.search}${url.hash}` || notificationDeepLinkFallback(type)
      }
    } catch {
      return notificationDeepLinkFallback(type)
    }
    return notificationDeepLinkFallback(type)
  }
  if (raw.startsWith('/')) {
    return raw
  }
  return `/${raw}`
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
