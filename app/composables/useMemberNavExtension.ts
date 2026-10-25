/**
 * Extension point for future member-rail extras (e.g. 通知 unread badge).
 * Keep null / empty until a notification center is wired — do not invent
 * a second hub chrome or a 諮詢紀錄 nav item.
 */
export function useMemberNavExtension() {
  /** Unread notification count for a future rail badge. Null = hide. */
  const notificationBadgeCount = ref<number | null>(null)

  const notificationBadgeLabel = computed(() => {
    const count = notificationBadgeCount.value
    if (count == null || count <= 0) {
      return undefined
    }
    return count > 99 ? '99+' : String(count)
  })

  return {
    notificationBadgeCount,
    notificationBadgeLabel
  }
}
