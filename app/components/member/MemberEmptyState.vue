<template>
  <div
    class="rounded-2xl border border-dashed border-default bg-elevated px-6 py-10 text-center"
    :data-testid="testId"
  >
    <p class="text-sm text-muted">
      {{ message }}
    </p>
    <div
      v-if="$slots.actions || ctaLabel"
      class="mt-4 flex flex-wrap items-center justify-center gap-2"
    >
      <slot name="actions">
        <AppButton
          v-if="ctaLabel"
          :to="ctaTo"
          :variant="ctaVariant"
          :data-testid="ctaTestId"
          @click="emit('cta')"
        >
          {{ ctaLabel }}
        </AppButton>
      </slot>
    </div>
  </div>
</template>

<script setup lang="ts">
withDefaults(defineProps<{
  message: string
  testId?: string
  ctaLabel?: string
  ctaTo?: string
  ctaTestId?: string
  ctaVariant?: 'primary' | 'outline' | 'ghost'
}>(), {
  testId: 'member-empty',
  ctaVariant: 'outline'
})

const emit = defineEmits<{
  cta: []
}>()
</script>
