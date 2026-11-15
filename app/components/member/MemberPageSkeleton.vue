<template>
  <div
    class="space-y-6"
    :data-testid="testId"
    role="status"
    aria-busy="true"
  >
    <template v-if="variant === 'dashboard'">
      <div class="h-8 w-40 max-w-full animate-pulse rounded bg-muted" />
      <div class="flex flex-col gap-6 lg:flex-row lg:items-start">
        <div class="flex w-full shrink-0 flex-col gap-4 lg:w-72">
          <div class="space-y-3 rounded-2xl border border-default bg-elevated p-5">
            <div class="h-4 w-3/5 animate-pulse rounded bg-muted" />
            <div class="h-4 w-full animate-pulse rounded bg-muted" />
            <div class="h-4 w-4/5 animate-pulse rounded bg-muted" />
            <div class="h-4 w-2/5 animate-pulse rounded bg-muted" />
          </div>
          <div class="space-y-3 rounded-2xl border border-default bg-elevated p-5">
            <div class="h-4 w-2/5 animate-pulse rounded bg-muted" />
            <div class="h-3 w-full animate-pulse rounded bg-muted" />
            <div class="h-10 w-28 animate-pulse rounded-md bg-muted" />
          </div>
        </div>
        <div class="min-w-0 flex-1 space-y-3">
          <div class="h-6 w-32 max-w-full animate-pulse rounded bg-muted" />
          <div class="h-28 w-full animate-pulse rounded-2xl border border-default bg-elevated" />
          <div class="h-28 w-full animate-pulse rounded-2xl border border-default bg-elevated" />
        </div>
      </div>
    </template>

    <template v-else-if="variant === 'list'">
      <div class="space-y-3">
        <div class="h-24 w-full animate-pulse rounded-2xl border border-default bg-elevated" />
        <div class="h-24 w-full animate-pulse rounded-2xl border border-default bg-elevated" />
        <div class="h-24 w-full animate-pulse rounded-2xl border border-default bg-elevated" />
      </div>
    </template>

    <template v-else-if="variant === 'form'">
      <div class="grid gap-6 lg:grid-cols-2">
        <div class="space-y-4 rounded-2xl border border-default bg-elevated p-5">
          <div class="h-5 w-2/5 animate-pulse rounded bg-muted" />
          <div class="h-10 w-full animate-pulse rounded-md bg-muted" />
          <div class="h-10 w-full animate-pulse rounded-md bg-muted" />
          <div class="h-10 w-full animate-pulse rounded-md bg-muted" />
        </div>
        <div class="space-y-4 rounded-2xl border border-default bg-elevated p-5">
          <div class="h-5 w-2/5 animate-pulse rounded bg-muted" />
          <div class="h-10 w-full animate-pulse rounded-md bg-muted" />
          <div class="h-10 w-full animate-pulse rounded-md bg-muted" />
          <div class="h-10 w-full animate-pulse rounded-md bg-muted" />
        </div>
      </div>
      <div class="h-10 w-28 animate-pulse rounded-md bg-muted" />
    </template>

    <template v-else-if="variant === 'detail'">
      <div class="h-4 w-24 animate-pulse rounded bg-muted" />
      <div class="h-8 w-56 max-w-full animate-pulse rounded bg-muted" />
      <div class="space-y-3 rounded-2xl border border-default bg-elevated p-5">
        <div class="h-4 w-3/5 animate-pulse rounded bg-muted" />
        <div class="h-4 w-full animate-pulse rounded bg-muted" />
        <div class="h-4 w-4/5 animate-pulse rounded bg-muted" />
        <div class="h-24 w-full animate-pulse rounded-xl bg-muted" />
      </div>
    </template>

    <template v-else>
      <div class="space-y-3 rounded-2xl border border-default bg-elevated p-5">
        <div class="h-4 w-2/5 animate-pulse rounded bg-muted" />
        <div class="h-3 w-full animate-pulse rounded bg-muted" />
        <div class="h-3 w-4/5 animate-pulse rounded bg-muted" />
        <div class="h-24 w-full animate-pulse rounded-xl bg-muted" />
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
withDefaults(defineProps<{
  variant?: 'dashboard' | 'list' | 'form' | 'detail' | 'default'
  testId?: string
}>(), {
  variant: 'default',
  testId: 'member-page-skeleton'
})
</script>
