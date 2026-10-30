import { describe, expect, it } from 'vitest'
import {
  formatUnreadBadgeLabel,
  notificationAccent,
  notificationDeepLinkFallback,
  notificationTimeParts,
  resolveNotificationDeepLink
} from '../../app/utils/notifications'
import { mapInboxNotification } from '../../app/utils/notifications-map'

describe('notifications helpers', () => {
  it('maps wave-1 types to accent and deep-link fallbacks', () => {
    expect(notificationAccent('expert_review_completed')).toBe('expert')
    expect(notificationAccent('member_registered')).toBe('welcome')
    expect(notificationDeepLinkFallback('expert_review_completed')).toBe('/app')
    expect(notificationDeepLinkFallback('member_registered')).toBe('/app/me')
  })

  it('resolves deep links and rejects bare external hosts without path', () => {
    expect(resolveNotificationDeepLink('/app/me', 'member_registered')).toBe('/app/me')
    expect(resolveNotificationDeepLink(null, 'expert_review_completed')).toBe('/app')
    expect(resolveNotificationDeepLink('https://example.com/app', 'member_registered')).toBe('/app')
  })

  it('formats unread badge with 99+ cap and hides zero', () => {
    expect(formatUnreadBadgeLabel(0)).toBeUndefined()
    expect(formatUnreadBadgeLabel(-1)).toBeUndefined()
    expect(formatUnreadBadgeLabel(1)).toBe('1')
    expect(formatUnreadBadgeLabel(2)).toBe('2')
    expect(formatUnreadBadgeLabel(99)).toBe('99')
    expect(formatUnreadBadgeLabel(100)).toBe('99+')
  })

  it('formats relative time buckets in viewer timezone', () => {
    const now = new Date('2026-10-25T18:00:00+08:00')
    expect(notificationTimeParts('2026-10-25T14:20:00+08:00', now, 'Asia/Taipei')).toEqual({
      key: 'today',
      time: '14:20'
    })
    expect(notificationTimeParts('2026-10-25T06:22:00Z', now, 'Asia/Taipei')).toEqual({
      key: 'today',
      time: '14:22'
    })
    expect(notificationTimeParts('2026-10-25T06:22:00Z', now, 'UTC')).toEqual({
      key: 'today',
      time: '06:22'
    })
    expect(notificationTimeParts('2026-10-24T10:00:00+08:00', now, 'Asia/Taipei')).toEqual({
      key: 'yesterday'
    })
    expect(notificationTimeParts('2026-10-20T10:00:00+08:00', now, 'Asia/Taipei')).toEqual({
      key: 'lastWeek'
    })
    expect(notificationTimeParts('2026-09-01T10:00:00+08:00', now, 'Asia/Taipei')).toEqual({
      key: 'older',
      date: '2026-09-01'
    })
  })
})

describe('notifications map', () => {
  it('maps core inbox DTO including event alias', () => {
    const mapped = mapInboxNotification({
      id: 'n1',
      event: 'member_registered',
      title: 'Welcome',
      body: 'Hi',
      created_at: '2026-10-24T10:00:00+08:00',
      read_at: null,
      path: '/app/me'
    })
    expect(mapped).toEqual({
      id: 'n1',
      type: 'member_registered',
      title: 'Welcome',
      body: 'Hi',
      createdAt: '2026-10-24T10:00:00+08:00',
      read: false,
      deepLink: '/app/me'
    })
  })

  it('treats read_at as read and falls back deep link by type', () => {
    const mapped = mapInboxNotification({
      id: 'n2',
      type: 'expert_review_completed',
      title: 'Done',
      body: 'Body',
      created_at: '2026-10-25T14:20:00+08:00',
      read_at: '2026-10-25T15:00:00+08:00',
      deep_link: ''
    })
    expect(mapped?.read).toBe(true)
    expect(mapped?.deepLink).toBe('/app')
  })
})
