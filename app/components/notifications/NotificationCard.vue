<template>
  <button
    type="button"
    class="notif-card w-full text-start"
    :class="[
      item.read ? 'notif-card-read' : 'notif-card-unread',
      accent === 'expert' ? 'notif-card-expert' : 'notif-card-welcome'
    ]"
    :data-testid="`notification-card-${item.id}`"
    :data-kind="item.type"
    :data-read="item.read ? 'true' : 'false'"
    @click="emit('open')"
  >
    <div class="flex items-start gap-2.5">
      <span
        class="notif-ico shrink-0"
        :class="accent === 'expert' ? 'notif-ico-expert' : 'notif-ico-welcome'"
        aria-hidden="true"
      >
        <UIcon
          :name="accent === 'expert' ? 'i-lucide-file-check-2' : 'i-lucide-user-round'"
          class="size-5"
        />
      </span>
      <div class="min-w-0 flex-1">
        <div class="flex items-start gap-2">
          <span
            v-if="!item.read"
            class="notif-unread-dot mt-1.5 shrink-0"
            aria-hidden="true"
          />
          <p
            class="min-w-0 flex-1 text-[15px] text-highlighted"
            :class="item.read ? 'font-medium' : 'font-extrabold'"
            data-testid="notification-title"
          >
            {{ item.title }}
          </p>
          <time
            class="shrink-0 text-xs text-muted"
            :datetime="item.createdAt"
            data-testid="notification-time"
          >
            {{ timeLabel }}
          </time>
        </div>
        <p
          class="mt-1 text-[13px] leading-relaxed text-muted"
          data-testid="notification-body"
        >
          {{ item.body }}
        </p>
        <span
          class="mt-2 inline-flex items-center gap-1 text-[13px] font-bold text-primary"
          data-testid="notification-cta"
        >
          {{ cta }}
          <UIcon
            name="i-lucide-arrow-right"
            class="size-3.5"
            aria-hidden="true"
          />
        </span>
      </div>
    </div>
  </button>
</template>

<script setup lang="ts">
import {
  notificationAccent,
  notificationTimeParts,
  type NotificationItem
} from '~/utils/notifications'

const props = defineProps<{
  item: NotificationItem
}>()

const emit = defineEmits<{
  open: []
}>()

const { t, te } = useI18n()

const accent = computed(() => notificationAccent(props.item.type))

const cta = computed(() => {
  const key = `notifications.kinds.${props.item.type}.cta`
  if (te(key)) {
    return t(key)
  }
  return t('notifications.openCta')
})

const timeLabel = computed(() => {
  const parts = notificationTimeParts(props.item.createdAt)
  if (parts.key === 'today' && parts.time) {
    return t('notifications.time.today', { time: parts.time })
  }
  if (parts.key === 'yesterday') {
    return t('notifications.time.yesterday')
  }
  if (parts.key === 'lastWeek') {
    return t('notifications.time.lastWeek')
  }
  return parts.date ?? props.item.createdAt
})
</script>
