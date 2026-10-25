<template>
  <div
    class="rounded-2xl border border-dashed border-error/40 bg-elevated px-6 py-10 text-center"
    :data-testid="testId"
    role="alert"
  >
    <p class="text-sm text-error">
      {{ message }}
    </p>
    <AppButton
      v-if="showRetry"
      class="mt-4"
      variant="outline"
      :data-testid="retryTestId"
      @click="emit('retry')"
    >
      {{ retryLabel || $t('memberShell.retry') }}
    </AppButton>
  </div>
</template>

<script setup lang="ts">
withDefaults(defineProps<{
  message: string
  testId?: string
  showRetry?: boolean
  retryLabel?: string
  retryTestId?: string
}>(), {
  testId: 'member-error',
  showRetry: true,
  retryTestId: 'member-error-retry'
})

const emit = defineEmits<{
  retry: []
}>()
</script>
