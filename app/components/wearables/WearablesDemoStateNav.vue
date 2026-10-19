<template>
  <nav
    class="flex flex-wrap gap-2 rounded-2xl border border-dashed border-default bg-elevated/60 p-3 text-xs"
    aria-label="Wearables demo states"
    data-testid="wearables-demo-nav"
  >
    <span class="w-full text-muted">
      {{ $t('wearables.demoNav.hint') }}
    </span>
    <AppButton
      v-for="item in items"
      :key="item.state"
      class="!px-2.5 !py-1 text-xs"
      :variant="item.active ? 'primary' : 'outline'"
      :to="item.to"
      :data-testid="`wearables-demo-${item.state}`"
    >
      {{ item.label }}
    </AppButton>
  </nav>
</template>

<script setup lang="ts">
import type { WearableDemoState } from '~/utils/wearables-mock'
import { WEARABLE_DEMO_STATE_QUERY } from '~/utils/wearables-mock'

const route = useRoute()
const localePath = useLocalePath()
const { t } = useI18n()

const current = computed(() => {
  const raw = route.query[WEARABLE_DEMO_STATE_QUERY]
  const value = Array.isArray(raw) ? raw[0] : raw
  if (value === 'empty' || value === 'no_data' || value === 'errors' || value === 'report') {
    return value
  }
  return 'list'
})

function demoLink(state?: WearableDemoState | 'report') {
  const query = state && state !== 'list' ? { [WEARABLE_DEMO_STATE_QUERY]: state } : {}
  return localePath({ path: '/app/wearables', query })
}

const items = computed(() => [
  { state: 'list', label: t('wearables.demoNav.list'), to: demoLink(), active: current.value === 'list' },
  { state: 'empty', label: t('wearables.demoNav.empty'), to: demoLink('empty'), active: current.value === 'empty' },
  { state: 'no_data', label: t('wearables.demoNav.noData'), to: demoLink('no_data'), active: current.value === 'no_data' },
  { state: 'errors', label: t('wearables.demoNav.errors'), to: demoLink('errors'), active: current.value === 'errors' },
  { state: 'report', label: t('wearables.demoNav.report'), to: localePath({ path: '/app/wearables', query: { [WEARABLE_DEMO_STATE_QUERY]: 'report' } }), active: current.value === 'report' }
])
</script>
