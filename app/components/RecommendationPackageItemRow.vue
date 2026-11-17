<template>
  <component
    :is="interactive ? 'button' : 'div'"
    :type="interactive ? 'button' : undefined"
    :class="rowClass"
    :data-testid="`sellable-item-${testIdSuffix}`"
    @click="onActivate"
  >
    <span class="mt-0.5 size-10 shrink-0 overflow-hidden rounded-xl bg-primary/10 text-primary">
      <img
        v-if="item.image_url"
        :src="item.image_url"
        :alt="displayName"
        class="size-full object-cover"
        loading="lazy"
        data-testid="sellable-item-image"
      >
      <span
        v-else
        class="flex size-full items-center justify-center"
        data-testid="sellable-item-image-fallback"
      >
        <UIcon
          name="i-lucide-pill"
          class="size-5"
        />
      </span>
    </span>
    <span class="min-w-0 flex-1">
      <span class="flex flex-wrap items-center gap-2">
        <span class="font-medium text-highlighted">
          {{ displayName }}
        </span>
        <span
          class="app-badge"
          :class="item.is_core ? 'app-badge-demo' : 'app-badge-pending'"
          :data-testid="`sellable-item-kind-${testIdSuffix}`"
        >
          {{ item.is_core ? $t('recommendation.itemKindCore') : $t('recommendation.itemKindFunctional') }}
        </span>
      </span>
    </span>
    <span
      class="app-badge app-badge-pending shrink-0"
      :data-testid="`sellable-item-dose-${testIdSuffix}`"
    >
      {{ doseLabel }}
    </span>
  </component>
</template>

<script setup lang="ts">
import type { RecommendationPackageItem } from '~/utils/candor-api'
import { packageItemDisplayName, packageItemDoseLabel } from '~/utils/recommendation-package-item'

const props = withDefaults(defineProps<{
  item: RecommendationPackageItem
  /** When true, render as a button with hover styles (recommendations detail open). */
  interactive?: boolean
  /** Prefer `code` when `name` is empty (checkout package summary). */
  preferCodeFallback?: boolean
  /** Tighter horizontal padding for nested cards (checkout). */
  dense?: boolean
}>(), {
  interactive: false,
  preferCodeFallback: false,
  dense: false
})

const emit = defineEmits<{
  select: []
}>()

const { t } = useI18n()

const testIdSuffix = computed(() => props.item.code || props.item.sellable_item_id)

const displayName = computed(() =>
  packageItemDisplayName(props.item, { preferCodeFallback: props.preferCodeFallback })
)

const doseLabel = computed(() => packageItemDoseLabel(t, props.item.daily_dose))

const rowClass = computed(() => {
  const pad = props.dense ? 'px-4 py-3' : 'px-5 py-4'
  const base = `flex w-full items-start gap-3 ${pad} text-start`
  if (!props.interactive) {
    return base
  }
  return `${base} transition hover:bg-muted focus-visible:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary/40`
})

function onActivate() {
  if (props.interactive) {
    emit('select')
  }
}
</script>
