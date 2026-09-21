<template>
  <ol class="app-timeline">
    <li
      v-for="(step, index) in steps"
      :key="step.id"
      class="app-timeline-step"
      :class="{
        'app-timeline-step-done': isDone(step.id),
        'app-timeline-step-current': isCurrent(step.id)
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
        <span
          v-if="index < steps.length - 1"
          class="app-timeline-line"
          :class="{ 'app-timeline-line-done': isReached(steps[index + 1]!.id) }"
        />
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
