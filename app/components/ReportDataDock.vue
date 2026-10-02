<script setup lang="ts">
import type { HealthReportResult } from '~/utils/candor-api'

const MORE_TESTS_ITEM_THRESHOLD = 30

const props = defineProps<{
  open: boolean
  collapsed: boolean
  results: HealthReportResult[]
  reportId?: string | null
  showInterpret?: boolean
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
  'update:collapsed': [value: boolean]
  'updated': [results: HealthReportResult[]]
  'interpret': []
}>()

const config = useRuntimeConfig()
const candor = useCandorApi()

const resolvedTestsUrl = ref('')
const urlLoaded = ref(false)

const individualTestsUrl = computed(() => resolvedTestsUrl.value.trim())

const showMoreTests = computed(() =>
  props.results.length < MORE_TESTS_ITEM_THRESHOLD
  && individualTestsUrl.value !== ''
)

async function loadIndividualTestsUrl() {
  const fallback = String(config.public.individualTestsUrl || '').trim()
  try {
    const remote = await candor.getClientConfig()
    const fromApi = String(remote.individual_tests_url || '').trim()
    // Empty string from API is intentional (hide button); only fall back on fetch failure.
    resolvedTestsUrl.value = fromApi
  } catch {
    resolvedTestsUrl.value = fallback
  } finally {
    urlLoaded.value = true
  }
}

watch(
  () => props.open,
  (open) => {
    if (open && !urlLoaded.value) {
      void loadIndividualTestsUrl()
    }
  },
  { immediate: true }
)

function toggle() {
  emit('update:collapsed', !props.collapsed)
}

function onUpdated(results: HealthReportResult[]) {
  emit('updated', results)
}
</script>

<template>
  <div
    v-if="open"
    class="absolute inset-x-3 top-3 z-20 flex flex-col overflow-hidden rounded-2xl border border-default bg-elevated shadow-lg sm:inset-x-4"
    :class="collapsed ? 'h-auto' : 'h-[80%]'"
    data-testid="chat-report-dock"
  >
    <div class="flex shrink-0 items-center justify-between gap-3 border-b border-default px-4 py-3 sm:px-5">
      <div class="flex min-w-0 items-center gap-2.5">
        <AssistantMark state="idle" />
        <div class="min-w-0">
          <p class="truncate text-sm font-semibold text-highlighted">
            {{ $t('labChart.dockTitle') }}
          </p>
          <p class="truncate text-xs text-muted">
            {{ $t('labChart.hint') }}
          </p>
        </div>
      </div>
      <div class="flex shrink-0 items-center gap-2">
        <AppButton
          v-if="showMoreTests"
          :href="individualTestsUrl"
          target="_blank"
          rel="noopener noreferrer"
          variant="outline"
          class="interpret-btn"
          data-testid="chat-report-more-tests"
        >
          {{ $t('labChart.moreTests') }}
        </AppButton>
        <AppButton
          v-if="showInterpret"
          variant="outline"
          class="interpret-btn"
          data-testid="chat-report-interpret"
          @click="emit('interpret')"
        >
          {{ $t('chat.explainHighlights') }}
        </AppButton>
        <button
          type="button"
          class="app-btn app-btn-ghost size-9 shrink-0 px-0"
          :aria-label="collapsed ? $t('labChart.expand') : $t('labChart.collapse')"
          data-testid="chat-report-dock-toggle"
          @click="toggle"
        >
          <UIcon
            :name="collapsed ? 'i-lucide-chevron-down' : 'i-lucide-chevron-up'"
            class="size-4"
          />
        </button>
      </div>
    </div>

    <div
      v-show="!collapsed"
      class="flex min-h-0 flex-1 flex-col"
    >
      <div class="shrink-0 border-b border-default px-4 py-2.5 sm:px-5">
        <ReportResultLegend />
      </div>
      <div class="min-h-0 flex-1 overflow-auto px-4 py-3 sm:px-5">
        <ReportResultTable
          :results="results"
          :report-id="reportId"
          :show-legend="false"
          @updated="onUpdated"
        />
      </div>
    </div>
  </div>
</template>

<style scoped>
:deep(.interpret-btn) {
  height: 2rem;
  min-height: 2rem;
  padding-inline: 0.75rem;
  font-size: 0.8125rem;
}
</style>
