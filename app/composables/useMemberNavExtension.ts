/**
 * Member-rail extras: notification unread badge for `/app/notifications`.
 * Do not invent a second hub chrome or a 諮詢紀錄 nav item.
 */
export function useMemberNavExtension() {
  const auth = useAuthStore()
  const notifications = useNotificationsStore()

  /** Unread notification count. Null = hide (guest or none). */
  const notificationBadgeCount = computed(() => {
    if (!auth.isMember) {
      return null
    }
    const count = notifications.unreadCount
    return count > 0 ? count : null
  })

  const notificationBadgeLabel = computed(() => {
    if (!auth.isMember) {
      return undefined
    }
    return notifications.unreadBadgeLabel
  })

  return {
    notificationBadgeCount,
    notificationBadgeLabel
  }
}
