<script setup lang="ts">
import type { HealthReportResult } from '~/utils/candor-api'
import {
  displayResultName,
  hasResultInterpretation
} from '~/utils/report-result-status'

const props = defineProps<{
  result: HealthReportResult
}>()

const open = ref(false)
const visible = computed(() => hasResultInterpretation(props.result))
</script>

<template>
  <template v-if="visible">
    <button
      type="button"
      class="inline-flex size-7 shrink-0 items-center justify-center rounded-md text-warning transition-colors hover:bg-warning/10"
      :aria-label="$t('labChart.interpretationInfo')"
      :data-testid="`report-result-info-${result.id}`"
      @click.stop="open = true"
    >
      <UIcon
        name="i-lucide-info"
        class="size-4"
      />
    </button>
    <UModal
      v-model:open="open"
      :title="displayResultName(result)"
      :ui="{
        content: 'sm:max-w-md',
        body: 'space-y-3 text-sm text-muted'
      }"
    >
      <template #body>
        <div
          class="space-y-3"
          :data-testid="`report-result-interpretation-${result.id}`"
        >
          <p v-if="result.description">
            <span class="font-medium text-highlighted">{{ $t('labChart.description') }}：</span>{{ result.description }}
          </p>
          <p v-if="result.possible_causes">
            <span class="font-medium text-highlighted">{{ $t('labChart.possibleCauses') }}：</span>{{ result.possible_causes }}
          </p>
          <p v-if="result.possible_risks">
            <span class="font-medium text-highlighted">{{ $t('labChart.possibleRisks') }}：</span>{{ result.possible_risks }}
          </p>
        </div>
      </template>
    </UModal>
  </template>
</template>
