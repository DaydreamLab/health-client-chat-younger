<template>
  <div
    v-if="auth.user"
    data-testid="account-user"
    class="flex min-w-0 items-center gap-2"
    :class="avatarOnly ? 'justify-center' : undefined"
    :title="avatarOnly ? auth.displayName : undefined"
  >
    <span
      class="inline-flex shrink-0 items-center justify-center rounded-full bg-primary/15 font-semibold text-primary"
      :class="compact || avatarOnly ? 'size-8 text-[0.65rem]' : 'size-9 text-xs'"
      aria-hidden="true"
    >
      {{ auth.initials }}
    </span>
    <div
      v-if="!avatarOnly"
      class="min-w-0"
    >
      <p class="truncate text-sm font-medium text-highlighted">
        {{ auth.displayName }}
      </p>
      <p
        v-if="!compact"
        class="truncate text-xs text-muted"
      >
        {{ auth.user.email || auth.user.role }}
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
withDefaults(defineProps<{
  compact?: boolean
  avatarOnly?: boolean
}>(), {
  compact: false,
  avatarOnly: false
})

const auth = useAuthStore()
</script>
