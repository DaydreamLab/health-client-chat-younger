import { CandorApiError } from '~/utils/candor-api'
import { mapInboxNotification } from '~/utils/notifications-map'
import {
  formatUnreadBadgeLabel,
  type NotificationItem
} from '~/utils/notifications'

export const useNotificationsStore = defineStore('notifications', () => {
  const api = useCandorApi()

  const items = ref<NotificationItem[]>([])
  /** Authoritative badge count from GET /notifications/unread-count. */
  const serverUnreadCount = ref(0)
  const loaded = ref(false)
  const loading = ref(false)
  const loadError = ref(false)
  const markingIds = ref<Set<string>>(new Set())

  const unreadCount = computed(() => {
    if (loaded.value) {
      return items.value.filter(item => !item.read).length
    }
    return serverUnreadCount.value
  })

  const unreadBadgeLabel = computed(() => formatUnreadBadgeLabel(
    loaded.value ? unreadCount.value : serverUnreadCount.value
  ))

  function clear() {
    items.value = []
    serverUnreadCount.value = 0
    loaded.value = false
    loading.value = false
    loadError.value = false
    markingIds.value = new Set()
  }

  async function refreshUnreadCount() {
    try {
      const data = await api.getNotificationsUnreadCount()
      const count = Number(data?.unread_count)
      serverUnreadCount.value = Number.isFinite(count) && count > 0 ? Math.floor(count) : 0
    } catch (error) {
      if (error instanceof CandorApiError && (error.statusCode === 403 || error.errorCode === 'member_required')) {
        clear()
        return
      }
      // Keep last known badge on transient errors.
    }
  }

  async function loadInbox() {
    loading.value = true
    loadError.value = false
    try {
      const data = await api.listNotifications()
      const rows = Array.isArray(data?.notifications) ? data.notifications : []
      items.value = rows
        .map(row => mapInboxNotification(row))
        .filter((row): row is NotificationItem => row != null)
      loaded.value = true
      serverUnreadCount.value = items.value.filter(item => !item.read).length
    } catch (error) {
      if (error instanceof CandorApiError && (error.statusCode === 403 || error.errorCode === 'member_required')) {
        clear()
        return
      }
      loadError.value = true
      items.value = []
      loaded.value = false
    } finally {
      loading.value = false
    }
  }

  async function markRead(id: string): Promise<boolean> {
    const target = items.value.find(item => item.id === id)
    if (target?.read) {
      return true
    }
    if (markingIds.value.has(id)) {
      return false
    }

    const next = new Set(markingIds.value)
    next.add(id)
    markingIds.value = next

    // Optimistic UI for badge + list.
    if (target) {
      target.read = true
    }
    if (serverUnreadCount.value > 0) {
      serverUnreadCount.value -= 1
    }

    try {
      await api.markNotificationRead(id)
      return true
    } catch {
      if (target) {
        target.read = false
      }
      serverUnreadCount.value += 1
      return false
    } finally {
      const done = new Set(markingIds.value)
      done.delete(id)
      markingIds.value = done
    }
  }

  async function markAllRead() {
    const unread = items.value.filter(item => !item.read)
    for (const item of unread) {
      await markRead(item.id)
    }
  }

  return {
    items,
    serverUnreadCount,
    loaded,
    loading,
    loadError,
    unreadCount,
    unreadBadgeLabel,
    clear,
    refreshUnreadCount,
    loadInbox,
    markRead,
    markAllRead
  }
})
