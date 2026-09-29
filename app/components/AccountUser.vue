<template>
  <NuxtLink
    v-if="auth.user"
    :to="localePath('/app/me')"
    data-testid="account-user"
    class="flex min-w-0 items-center gap-2 rounded-md outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
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
  </NuxtLink>
</template>

<script setup lang="ts">
withDefaults(defineProps<{
  compact?: boolean
  avatarOnly?: boolean
}>(), {
  compact: false,
  avatarOnly: false
})

const localePath = useLocalePath()
const auth = useAuthStore()
</script>
