import type { NotificationItem } from './notifications'

/**
 * Beta sample notifications (Irice list mock).
 * Omit the "已讀占位" row — only real Wave-1 event shapes.
 * Stable ids so mark-read localStorage survives reloads.
 */
export const DEMO_NOTIFICATIONS: NotificationItem[] = [
  {
    id: 'demo-notif-expert-finalized',
    kind: 'expert_report_finalized',
    createdAt: '2026-10-25T14:20:00+08:00',
    read: false,
    isSample: true
  },
  {
    id: 'demo-notif-member-welcome',
    kind: 'member_welcome',
    createdAt: '2026-10-24T10:00:00+08:00',
    read: false,
    isSample: true
  }
]

export function listDemoNotifications(): NotificationItem[] {
  return DEMO_NOTIFICATIONS.map(item => ({ ...item }))
}

export function getDemoNotification(id: string): NotificationItem | undefined {
  const found = DEMO_NOTIFICATIONS.find(item => item.id === id)
  return found ? { ...found } : undefined
}
