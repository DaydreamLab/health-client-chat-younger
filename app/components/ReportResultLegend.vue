<template>
  <div
    class="flex flex-wrap items-center gap-x-3 gap-y-1.5 rounded-lg bg-muted px-3 py-2 text-xs text-muted"
    data-testid="report-result-legend"
  >
    <span class="inline-flex items-center">
      <i class="yr-dot ok" />{{ $t('labChart.optimal') }}
    </span>
    <span class="inline-flex items-center">
      <i class="yr-dot warn" />{{ $t('labChart.caution') }}
    </span>
    <span class="inline-flex items-center">
      <i class="yr-dot alert" />{{ $t('labChart.alert') }}
    </span>
    <span class="text-dimmed sm:ms-auto">{{ $t('labChart.colorHint') }}</span>
  </div>
</template>

<style scoped>
.yr-dot {
  display: inline-block;
  width: 0.55rem;
  height: 0.55rem;
  margin-right: 0.3rem;
  vertical-align: middle;
  border-radius: 999px;
}

.yr-dot.ok {
  background: var(--ui-success);
}

.yr-dot.warn {
  background: var(--ui-warning);
}

.yr-dot.alert {
  background: var(--ui-error);
}
</style>
