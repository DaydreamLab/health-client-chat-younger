<script setup lang="ts">
defineProps<{
  mode: 'table' | 'cards'
}>()

const emit = defineEmits<{
  'update:mode': [mode: 'table' | 'cards']
}>()
</script>

<template>
  <div
    class="inline-flex shrink-0 rounded-lg bg-muted p-0.5"
    role="group"
    :aria-label="$t('member.reportView')"
    data-testid="health-report-view"
  >
    <button
      type="button"
      class="inline-flex items-center justify-center rounded-md p-1.5"
      :class="mode === 'table' ? 'bg-default text-highlighted shadow-sm' : 'text-muted'"
      :aria-pressed="mode === 'table'"
      :aria-label="$t('member.viewList')"
      data-testid="health-report-view-table"
      @click="emit('update:mode', 'table')"
    >
      <UIcon
        name="i-lucide-list"
        class="size-4"
      />
    </button>
    <button
      type="button"
      class="inline-flex items-center justify-center rounded-md p-1.5"
      :class="mode === 'cards' ? 'bg-default text-highlighted shadow-sm' : 'text-muted'"
      :aria-pressed="mode === 'cards'"
      :aria-label="$t('member.viewCards')"
      data-testid="health-report-view-cards"
      @click="emit('update:mode', 'cards')"
    >
      <UIcon
        name="i-lucide-layout-grid"
        class="size-4"
      />
    </button>
  </div>
</template>
