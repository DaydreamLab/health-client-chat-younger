<template>
  <div
    class="rounded-2xl border border-dashed border-default bg-elevated px-6 py-10"
    :data-testid="testId"
    role="status"
    aria-live="polite"
  >
    <div class="flex flex-col items-center justify-center gap-3 text-center">
      <span
        class="size-8 animate-spin rounded-full border-2 border-primary/25 border-t-primary"
        aria-hidden="true"
      />
      <p class="text-sm text-muted">
        {{ message || $t('memberShell.loading') }}
      </p>
    </div>
    <div
      v-if="skeleton"
      class="mt-6 space-y-3"
      aria-hidden="true"
    >
      <div class="h-4 w-2/5 animate-pulse rounded bg-muted" />
      <div class="h-3 w-full animate-pulse rounded bg-muted" />
      <div class="h-3 w-4/5 animate-pulse rounded bg-muted" />
      <div class="h-24 w-full animate-pulse rounded-xl bg-muted" />
    </div>
  </div>
</template>

<script setup lang="ts">
withDefaults(defineProps<{
  message?: string
  testId?: string
  skeleton?: boolean
}>(), {
  testId: 'member-loading',
  skeleton: false
})
</script>
