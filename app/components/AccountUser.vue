<template>
  <div
    v-if="auth.user"
    data-testid="account-user"
    class="flex min-w-0 items-center gap-2"
  >
    <span
      class="inline-flex shrink-0 items-center justify-center rounded-full bg-primary/15 font-semibold text-primary"
      :class="compact ? 'size-8 text-[0.65rem]' : 'size-9 text-xs'"
      aria-hidden="true"
    >
      {{ auth.initials }}
    </span>
    <div class="min-w-0">
      <p class="truncate text-sm font-medium text-highlighted">
        {{ auth.displayName }}
      </p>
      <p
        v-if="!compact"
        class="truncate text-xs text-muted"
      >
        {{ auth.user.email }}
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
withDefaults(defineProps<{
  compact?: boolean
}>(), {
  compact: false
})

const auth = useAuthStore()
</script>
