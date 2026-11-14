<template>
  <div data-testid="app-page">
    <div
      v-if="!settled"
      class="space-y-6"
      data-testid="app-skeleton"
      role="status"
      aria-busy="true"
    >
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
    </div>

    <div
      v-else-if="!auth.isMember"
      class="mx-auto w-full max-w-md"
      data-testid="app-login"
    >
      <AuthLoginForm
        stay
        :show-description="false"
        :show-guest-link="false"
      />
    </div>

    <MemberMyHealth v-else />
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  layout: 'user',
  middleware: 'auth'
})

const auth = useAuthStore()
const { settled } = useAuthClientSync()
</script>
