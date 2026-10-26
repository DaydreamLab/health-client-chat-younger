<template>
  <div class="space-y-6">
    <div class="flex flex-wrap items-start gap-2">
      <div class="min-w-0 flex-1">
        <h1 class="text-2xl font-semibold text-highlighted">
          {{ $t('notifications.title') }}
        </h1>
        <p class="mt-1 text-sm text-muted">
          {{ gateLocked ? $t('notifications.guestSubtitle') : $t('notifications.subtitle') }}
        </p>
      </div>
      <button
        v-if="!gateLocked && !loading && !loadError && unreadCount > 0"
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
      <MemberLoadingState
        v-if="loading && !list.length"
        :message="$t('notifications.loading')"
        test-id="notifications-loading"
        skeleton
      />
      <MemberErrorState
        v-else-if="loadError"
        :message="$t('notifications.loadError')"
        test-id="notifications-error"
        retry-test-id="notifications-retry"
        @retry="loadInbox"
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
    </template>
  </div>
</template>

<script setup lang="ts">
import type { NotificationItem } from '~/utils/notifications'

definePageMeta({
  layout: 'user',
  middleware: 'auth'
})

type FilterMode = 'all' | 'unread'

const localePath = useLocalePath()
const nuxtApp = useNuxtApp()
const auth = useAuthStore()
const notifications = useNotificationsStore()

const filter = ref<FilterMode>('all')
const gateLocked = ref(nuxtApp.isHydrating || !auth.isMember)

const list = computed(() => notifications.items)
const loading = computed(() => notifications.loading)
const loadError = computed(() => notifications.loadError)
const unreadCount = computed(() => notifications.unreadCount)

const visibleList = computed(() => {
  if (filter.value === 'unread') {
    return list.value.filter(item => !item.read)
  }
  return list.value
})

function syncGate() {
  gateLocked.value = !auth.isMember
}

async function loadInbox() {
  if (!auth.isMember) {
    notifications.clear()
    return
  }
  await notifications.loadInbox()
}

async function onMarkAllRead() {
  await notifications.markAllRead()
}

async function onOpen(item: NotificationItem) {
  await notifications.markRead(item.id)
  const path = item.deepLink || '/app/notifications'
  void navigateTo(localePath(path))
}

onMounted(() => {
  syncGate()
  void loadInbox()
})

watch(() => auth.isMember, (member) => {
  syncGate()
  if (member) {
    void loadInbox()
  } else {
    notifications.clear()
  }
})
</script>
