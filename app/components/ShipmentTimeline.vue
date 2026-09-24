<template>
  <ol
    class="app-timeline"
    :style="{ '--timeline-progress': String(progress) }"
  >
    <li
      v-for="step in steps"
      :key="step.id"
      class="app-timeline-step"
      :class="{
        'app-timeline-step-done': isDone(step.id),
        'app-timeline-step-current': isCurrent(step.id),
        'app-timeline-step-first': step.id === steps[0]?.id,
        'app-timeline-step-last': step.id === steps[steps.length - 1]?.id
      }"
      :aria-current="isCurrent(step.id) ? 'step' : undefined"
      :data-testid="`timeline-${step.id}`"
    >
      <div class="app-timeline-track">
        <span class="app-timeline-dot">
          <UIcon
            v-if="isDone(step.id)"
            name="i-lucide-check"
            class="size-2.5 text-white"
          />
        </span>
      </div>
      <p
        class="mt-2 text-xs font-medium"
        :class="isReached(step.id) ? 'text-highlighted' : 'text-muted'"
      >
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

const progress = computed(() => {
  const index = shipmentStepIds.indexOf(current.value)
  const max = shipmentStepIds.length - 1
  if (max <= 0 || index < 0) {
    return 0
  }
  return Math.min(1, Math.max(0, index / max))
})

function isReached(id: ShipmentStepId) {
  return shipmentStepIds.indexOf(id) <= shipmentStepIds.indexOf(current.value)
}

function isCurrent(id: ShipmentStepId) {
  return id === current.value
}

function isDone(id: ShipmentStepId) {
  return shipmentStepIds.indexOf(id) < shipmentStepIds.indexOf(current.value)
}

function formatStepTime(at: string | null) {
  if (!at) {
    return '—'
  }

  return at.replace('T', ' ').slice(0, 16).replace(/-/g, '/')
}
</script>
