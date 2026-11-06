<script setup lang="ts">
import {
  expertBookingStatusI18nKey,
  expertBookingStatusTone
} from '~/utils/expert-booking'

const props = defineProps<{
  status: string | null | undefined
}>()

const toneClass = computed(() => {
  switch (expertBookingStatusTone(props.status)) {
    case 'pending':
      return 'bg-amber-500/15 text-amber-800 ring-amber-500/30'
    case 'info':
      return 'bg-sky-500/15 text-sky-800 ring-sky-500/30'
    case 'success':
      return 'bg-emerald-500/15 text-emerald-800 ring-emerald-500/30'
    default:
      return 'bg-muted/40 text-muted ring-default'
  }
})
</script>

<template>
  <span
    class="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset"
    :class="toneClass"
    data-testid="expert-booking-status-pill"
  >
    {{ $t(expertBookingStatusI18nKey(status)) }}
  </span>
</template>
