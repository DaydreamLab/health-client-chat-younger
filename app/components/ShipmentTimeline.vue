<template>
  <ol class="app-timeline">
    <li
      v-for="(step, index) in steps"
      :key="step.id"
      class="app-timeline-step"
      :class="{ 'app-timeline-step-done': isReached(step.id) }"
      :data-testid="`timeline-${step.id}`"
    >
      <div class="app-timeline-track">
        <span class="app-timeline-dot" />
        <span
          v-if="index < steps.length - 1"
          class="app-timeline-line"
          :class="{ 'app-timeline-line-done': isReached(steps[index + 1]!.id) }"
        />
      </div>
      <p class="mt-2 text-xs font-medium text-highlighted">
        {{ $t(`orders.${step.id}`) }}
      </p>
      <p class="mt-1 text-[11px] tabular-nums text-dimmed">
        {{ formatStepTime(step.at) }}
      </p>
    </li>
  </ol>
</template>

<script setup lang="ts">
import { shipmentStepIds, timelineStatus, type ShipmentStep, type ShipmentStepId } from '~/utils/first-order'

const props = defineProps<{
  timeline: ShipmentStep[]
}>()

const steps = computed(() => {
  return shipmentStepIds.map(id => props.timeline.find(step => step.id === id) ?? { id, at: null })
})

const current = computed(() => timelineStatus(props.timeline))

function isReached(id: ShipmentStepId) {
  const order = shipmentStepIds.indexOf(id)
  const now = shipmentStepIds.indexOf(current.value)
  return order <= now
}

function formatStepTime(at: string | null) {
  if (!at) {
    return '—'
  }

  return at.replace('T', ' ').slice(0, 16).replace(/-/g, '/')
}
</script>
