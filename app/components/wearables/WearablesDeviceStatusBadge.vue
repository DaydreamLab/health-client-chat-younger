<template>
  <span
    class="app-badge shrink-0"
    :class="badgeClass"
    :data-testid="`wearables-status-${status}`"
  >
    {{ $t(`wearables.status.${status}`) }}
  </span>
</template>

<script setup lang="ts">
import type { WearableDeviceStatus } from '~/utils/wearables-mock'

const props = defineProps<{
  status: WearableDeviceStatus
}>()

const badgeClass = computed(() => {
  switch (props.status) {
    case 'connected':
      return 'app-badge-started'
    case 'delayed':
      return 'app-badge-pending'
    default:
      return 'app-badge-demo'
  }
})
</script>
