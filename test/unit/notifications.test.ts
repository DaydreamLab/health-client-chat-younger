import { describe, expect, it } from 'vitest'
import {
  formatUnreadBadgeLabel,
  notificationAccent,
  notificationDeepLinkPath,
  notificationTimeParts,
  parseNotificationsDemoMode
} from '../../app/utils/notifications'
import {
  DEMO_NOTIFICATIONS,
  getDemoNotification,
  listDemoNotifications
} from '../../app/utils/notifications-mock'

describe('notifications helpers', () => {
  it('parses demo mode (default sample, empty when requested)', () => {
    expect(parseNotificationsDemoMode(undefined)).toBe('sample')
    expect(parseNotificationsDemoMode('sample')).toBe('sample')
    expect(parseNotificationsDemoMode('empty')).toBe('empty')
  })

  it('maps wave-1 kinds to accent and deep links', () => {
    expect(notificationAccent('expert_report_finalized')).toBe('expert')
    expect(notificationAccent('member_welcome')).toBe('welcome')
    expect(notificationDeepLinkPath('expert_report_finalized')).toBe('/app')
    expect(notificationDeepLinkPath('member_welcome')).toBe('/app/me')
  })

  it('formats unread badge with 99+ cap and hides zero', () => {
    expect(formatUnreadBadgeLabel(0)).toBeUndefined()
    expect(formatUnreadBadgeLabel(-1)).toBeUndefined()
    expect(formatUnreadBadgeLabel(1)).toBe('1')
    expect(formatUnreadBadgeLabel(2)).toBe('2')
    expect(formatUnreadBadgeLabel(99)).toBe('99')
    expect(formatUnreadBadgeLabel(100)).toBe('99+')
  })

  it('formats relative time buckets', () => {
    const now = new Date('2026-10-25T18:00:00+08:00')
    expect(notificationTimeParts('2026-10-25T14:20:00+08:00', now)).toEqual({
      key: 'today',
      time: '14:20'
    })
    expect(notificationTimeParts('2026-10-24T10:00:00+08:00', now)).toEqual({
      key: 'yesterday'
    })
    expect(notificationTimeParts('2026-10-20T10:00:00+08:00', now)).toEqual({
      key: 'lastWeek'
    })
    expect(notificationTimeParts('2026-09-01T10:00:00+08:00', now)).toEqual({
      key: 'older',
      date: '2026-09-01'
    })
  })
})

describe('notifications mock', () => {
  it('ships two unread sample rows and no read placeholder', () => {
    const list = listDemoNotifications()
    expect(list).toHaveLength(2)
    expect(list.every(item => !item.read)).toBe(true)
    expect(list.map(item => item.kind)).toEqual([
      'expert_report_finalized',
      'member_welcome'
    ])
    expect(list.some(item => item.id.includes('placeholder'))).toBe(false)
    expect(DEMO_NOTIFICATIONS).toHaveLength(2)
    expect(getDemoNotification('demo-notif-expert-finalized')?.kind).toBe(
      'expert_report_finalized'
    )
  })
})
