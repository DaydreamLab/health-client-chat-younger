<template>
  <div
    class="h-[280px] w-full min-w-0"
    data-testid="lab-bar-chart"
  >
    <ClientOnly>
      <BarChart
        v-if="ready"
        :data="rows"
        :height="280"
        x-axis="label"
        :categories="categories"
        :y-axis="['yours', 'ref']"
        :radius="4"
        :bar-gap="4"
        :y-grid-line="true"
        :hide-legend="false"
        :legend-position="LegendPosition.TopRight"
        :aria-label="$t('labChart.title')"
      />
      <template #fallback>
        <div class="flex h-[280px] items-center justify-center text-sm text-muted">
          {{ $t('labChart.title') }}
        </div>
      </template>
    </ClientOnly>
  </div>
</template>

<script setup lang="ts">
import { LegendPosition } from 'nuxt-charts/enums'
import { labChartRows } from '~/utils/first-order'

const { t } = useI18n()
const ready = ref(false)

const yoursColor = '#0784B1'
const refColor = '#9FB3C5'

const rows = computed(() => labChartRows.map(row => ({
  label: t(`markers.${row.key}`),
  yours: row.yours,
  ref: row.ref
})))

const categories = computed(() => ({
  yours: {
    name: t('labChart.yours'),
    color: yoursColor
  },
  ref: {
    name: t('labChart.ref'),
    color: refColor
  }
}))

onMounted(async () => {
  await nextTick()
  ready.value = true
})
</script>
