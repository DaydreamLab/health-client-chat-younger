import type { InboxNotification } from './candor-api'
import {
  resolveNotificationDeepLink,
  type NotificationItem
} from './notifications'

/**
 * Map core inbox DTO → UI row.
 * Accepts `type` or `event` / `event_type`, and `deep_link` or `path` / `href`.
 */
export function mapInboxNotification(
  raw: InboxNotification | Record<string, unknown>
): NotificationItem | null {
  const row = raw as Record<string, unknown>
  const id = typeof row.id === 'string' ? row.id : ''
  if (!id) {
    return null
  }

  const type = pickString(row, ['type', 'event', 'event_type']) || 'unknown'
  const title = pickString(row, ['title']) || ''
  const body = pickString(row, ['body']) || ''
  const createdAt = pickString(row, ['created_at', 'createdAt']) || ''
  const readAt = pickNullableString(row, ['read_at', 'readAt'])
  const deepLinkRaw = pickString(row, ['deep_link', 'deepLink', 'path', 'href'])

  return {
    id,
    type,
    title,
    body,
    createdAt,
    read: Boolean(readAt),
    deepLink: resolveNotificationDeepLink(deepLinkRaw || null, type)
  }
}

function pickString(row: Record<string, unknown>, keys: string[]): string {
  for (const key of keys) {
    const value = row[key]
    if (typeof value === 'string' && value.trim()) {
      return value
    }
  }
  return ''
}

function pickNullableString(row: Record<string, unknown>, keys: string[]): string | null {
  for (const key of keys) {
    const value = row[key]
    if (value === null) {
      return null
    }
    if (typeof value === 'string') {
      return value
    }
  }
  return null
}
