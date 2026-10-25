import {
  formatUnreadBadgeLabel,
  type NotificationItem,
  type NotificationsDemoMode
} from '~/utils/notifications'
import { listDemoNotifications } from '~/utils/notifications-mock'

/** Persisted read ids for mock inbox (until core inbox API exists). */
const READ_IDS_KEY = 'candor.notifications.readIds'

function readStoredReadIds(): Set<string> {
  if (!import.meta.client) {
    return new Set()
  }

  try {
    const raw = localStorage.getItem(READ_IDS_KEY)
    if (!raw) {
      return new Set()
    }
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) {
      return new Set()
    }
    return new Set(parsed.filter((id): id is string => typeof id === 'string'))
  } catch {
    return new Set()
  }
}

function writeStoredReadIds(ids: Set<string>) {
  if (!import.meta.client) {
    return
  }
  localStorage.setItem(READ_IDS_KEY, JSON.stringify([...ids]))
}

function applyReadState(items: NotificationItem[], readIds: Set<string>): NotificationItem[] {
  return items.map(item => ({
    ...item,
    read: item.read || readIds.has(item.id)
  }))
}

export const useNotificationsStore = defineStore('notifications', () => {
  const items = ref<NotificationItem[]>([])
  const usingDemo = ref(false)
  const loaded = ref(false)

  const unreadCount = computed(() => items.value.filter(item => !item.read).length)

  const unreadBadgeLabel = computed(() => formatUnreadBadgeLabel(unreadCount.value))

  function clear() {
    items.value = []
    usingDemo.value = false
    loaded.value = false
  }

  /**
   * Load inbox for a member. No core API yet — sample list unless `?demo=empty`.
   * Structure reserved for a future `GET` inbox + mark-read endpoints.
   */
  function loadForMember(demoMode: NotificationsDemoMode = 'sample') {
    if (demoMode === 'empty') {
      items.value = []
      usingDemo.value = false
      loaded.value = true
      return
    }

    const readIds = readStoredReadIds()
    items.value = applyReadState(listDemoNotifications(), readIds)
    usingDemo.value = true
    loaded.value = true
  }

  function markRead(id: string) {
    const target = items.value.find(item => item.id === id)
    if (!target || target.read) {
      return
    }
    target.read = true
    const readIds = readStoredReadIds()
    readIds.add(id)
    writeStoredReadIds(readIds)
  }

  function markAllRead() {
    const readIds = readStoredReadIds()
    let changed = false
    for (const item of items.value) {
      if (!item.read) {
        item.read = true
        readIds.add(item.id)
        changed = true
      }
    }
    if (changed) {
      writeStoredReadIds(readIds)
    }
  }

  return {
    items,
    usingDemo,
    loaded,
    unreadCount,
    unreadBadgeLabel,
    clear,
    loadForMember,
    markRead,
    markAllRead
  }
})
