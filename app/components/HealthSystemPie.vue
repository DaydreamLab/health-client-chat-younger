<template>
  <div class="flex flex-col items-center gap-4 sm:flex-row sm:items-center">
    <div
      class="relative size-48 shrink-0 overflow-visible"
      data-testid="health-system-pie"
    >
      <ClientOnly>
        <DonutChart
          v-if="ready"
          :data="rows"
          name-key="name"
          value-key="value"
          :categories="categories"
          variant="gradient"
          glow
          :height="192"
          :arc-width="20"
          :pad-angle="4"
          :corner-radius="4"
          :hide-legend="true"
          :aria-label="$t('member.pieTitle')"
        />
        <template #fallback>
          <div class="flex size-full items-center justify-center text-sm text-muted">
            {{ $t('member.pieTitle') }}
          </div>
        </template>
      </ClientOnly>
    </div>
    <ul class="w-full space-y-2 text-sm">
      <li
        v-for="system in healthSystems"
        :key="system.key"
        class="flex items-center justify-between gap-3"
      >
        <span class="flex items-center gap-2 text-highlighted">
          <span
            class="size-2.5 rounded-full"
            :style="{ backgroundColor: system.color }"
          />
          {{ $t(`systems.${system.key}`) }}
        </span>
        <span class="tabular-nums text-muted">
          {{ system.score }}
        </span>
      </li>
    </ul>
  </div>
</template>

<script setup lang="ts">
import { healthSystems } from '~/utils/health-demo'

const { t } = useI18n()
const ready = ref(false)

const rows = computed(() => healthSystems.map(system => ({
  name: t(`systems.${system.key}`),
  value: system.score
})))

const categories = computed(() => Object.fromEntries(
  healthSystems.map(system => [
    t(`systems.${system.key}`),
    {
      name: t(`systems.${system.key}`),
      color: system.color
    }
  ])
))

onMounted(async () => {
  await nextTick()
  ready.value = true
})
</script>
