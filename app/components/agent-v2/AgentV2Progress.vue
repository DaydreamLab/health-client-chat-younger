<template>
  <div
    class="grid w-full grid-cols-3 gap-2"
    data-testid="agent-v2-progress"
    role="list"
  >
    <div
      v-for="item in items"
      :key="item.key"
      class="flex min-w-0 flex-col items-center gap-1 rounded-lg border px-2 py-2 text-center"
      :class="item.done
        ? 'border-brand-200 bg-brand-50 text-highlighted'
        : 'border-default bg-default text-muted'"
      role="listitem"
      :data-testid="`agent-v2-progress-${item.key}`"
      :data-done="item.done ? '1' : '0'"
    >
      <span
        class="text-xs font-medium"
        data-testid="agent-v2-progress-label"
      >{{ item.label }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import {
  AGENT_V2_REQUIREMENTS,
  agentV2RequirementDone,
  type AgentV2Requirement
} from '~/utils/agent-v2'

const props = defineProps<{
  missing: readonly AgentV2Requirement[]
}>()

const { t } = useI18n()

const items = computed(() =>
  AGENT_V2_REQUIREMENTS.map(key => ({
    key,
    label: t(`agentV2.requirements.${key}`),
    done: agentV2RequirementDone(key, props.missing)
  }))
)
</script>
