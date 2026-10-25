<template>
  <div class="space-y-6">
    <div class="flex flex-wrap items-start gap-2">
      <div class="min-w-0 flex-1">
        <div class="flex flex-wrap items-center gap-2">
          <h1 class="text-2xl font-semibold text-highlighted">
            {{ $t('notifications.title') }}
          </h1>
          <span
            v-if="usingDemo && !gateLocked"
            class="app-badge app-badge-demo"
            data-testid="notifications-sample-badge"
          >
            {{ $t('notifications.sampleData') }}
          </span>
        </div>
        <p class="mt-1 text-sm text-muted">
          {{ gateLocked ? $t('notifications.guestSubtitle') : $t('notifications.subtitle') }}
        </p>
        <p
          v-if="usingDemo && !gateLocked"
          class="mt-1 text-sm leading-6 text-muted"
          data-testid="notifications-demo-hint"
        >
          {{ $t('notifications.demoHint') }}
        </p>
      </div>
      <button
        v-if="!gateLocked && unreadCount > 0"
        type="button"
        class="shrink-0 rounded-lg px-2.5 py-1.5 text-sm font-bold text-primary hover:bg-primary/10"
        data-testid="notifications-mark-all-read"
        @click="onMarkAllRead"
      >
        {{ $t('notifications.markAllRead') }}
      </button>
    </div>

    <MemberAuthGate
      v-if="gateLocked"
      :title="$t('notifications.guestRequired')"
      :hint="$t('notifications.guestRequiredHint')"
      icon="i-lucide-bell"
      test-id="notifications-auth-gate"
      login-test-id="notifications-login"
      register-test-id="notifications-register"
      back-to-chat-test-id="notifications-back-chat"
    />

    <template v-else>
      <div
        class="flex flex-wrap gap-2"
        role="group"
        :aria-label="$t('notifications.filterLabel')"
        data-testid="notifications-filters"
      >
        <button
          type="button"
          class="notif-filter-chip"
          :aria-pressed="filter === 'all'"
          data-testid="notifications-filter-all"
          @click="filter = 'all'"
        >
          {{ $t('notifications.filterAll') }}
          <span class="ms-1 font-extrabold tabular-nums">{{ list.length }}</span>
        </button>
        <button
          type="button"
          class="notif-filter-chip"
          :aria-pressed="filter === 'unread'"
          data-testid="notifications-filter-unread"
          @click="filter = 'unread'"
        >
          {{ $t('notifications.filterUnread') }}
          <span class="ms-1 font-extrabold tabular-nums">{{ unreadCount }}</span>
        </button>
      </div>

      <div
        v-if="!visibleList.length"
        class="flex min-h-64 flex-col items-center justify-center gap-2.5 rounded-2xl border border-dashed border-default bg-elevated/85 px-6 py-10 text-center"
        data-testid="notifications-empty"
      >
        <span
          class="flex size-13 items-center justify-center rounded-full bg-muted text-muted"
          aria-hidden="true"
        >
          <UIcon
            name="i-lucide-bell"
            class="size-6"
          />
        </span>
        <p class="text-base font-bold text-highlighted">
          {{ $t('notifications.emptyTitle') }}
        </p>
        <p class="max-w-sm text-sm leading-relaxed text-muted">
          {{ $t('notifications.emptyHint') }}
        </p>
      </div>

      <ul
        v-else
        class="space-y-2.5"
        data-testid="notifications-list"
      >
        <li
          v-for="item in visibleList"
          :key="item.id"
        >
          <NotificationsNotificationCard
            :item="item"
            @open="onOpen(item)"
          />
        </li>
      </ul>
    </template>
  </div>
</template>

<script setup lang="ts">
import {
  notificationDeepLinkPath,
  NOTIFICATIONS_DEMO_QUERY,
  parseNotificationsDemoMode,
  type NotificationItem
} from '~/utils/notifications'

definePageMeta({
  layout: 'user',
  middleware: 'auth'
})

type FilterMode = 'all' | 'unread'

const localePath = useLocalePath()
const route = useRoute()
const nuxtApp = useNuxtApp()
const auth = useAuthStore()
const notifications = useNotificationsStore()

const filter = ref<FilterMode>('all')
const gateLocked = ref(nuxtApp.isHydrating || !auth.isMember)

const list = computed(() => notifications.items)
const usingDemo = computed(() => notifications.usingDemo)
const unreadCount = computed(() => notifications.unreadCount)

const visibleList = computed(() => {
  if (filter.value === 'unread') {
    return list.value.filter(item => !item.read)
  }
  return list.value
})

const demoMode = computed(() => {
  const raw = route.query[NOTIFICATIONS_DEMO_QUERY]
  const value = Array.isArray(raw) ? raw[0] : raw
  return parseNotificationsDemoMode(typeof value === 'string' ? value : undefined)
})

function syncGate() {
  gateLocked.value = !auth.isMember
}

function loadInbox() {
  if (!auth.isMember) {
    notifications.clear()
    return
  }
  notifications.loadForMember(demoMode.value)
}

function onMarkAllRead() {
  notifications.markAllRead()
}

function onOpen(item: NotificationItem) {
  notifications.markRead(item.id)
  void navigateTo(localePath(notificationDeepLinkPath(item.kind)))
}

onMounted(() => {
  syncGate()
  loadInbox()
})

watch(() => auth.isMember, (member) => {
  syncGate()
  if (member) {
    loadInbox()
  } else {
    notifications.clear()
  }
})

watch(demoMode, () => {
  if (auth.isMember && !gateLocked.value) {
    loadInbox()
  }
})
</script>
