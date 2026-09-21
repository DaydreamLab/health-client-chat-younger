<template>
  <Teleport to="body">
    <div
      v-if="item"
      class="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center"
      data-testid="supplement-detail"
      @click.self="emit('close')"
    >
      <article class="max-h-[90dvh] w-full max-w-lg overflow-y-auto rounded-2xl border border-default bg-elevated p-5 shadow-xl">
        <div class="flex items-start justify-between gap-3">
          <div class="flex items-center gap-3">
            <span
              class="flex size-14 items-center justify-center rounded-2xl text-xl font-semibold text-white"
              :style="{ backgroundColor: item.swatch }"
            >
              {{ item.id.slice(0, 1).toUpperCase() }}
            </span>
            <div>
              <h2 class="text-lg font-semibold text-highlighted">
                {{ $t(`shop.items.${item.id}.name`) }}
              </h2>
              <p class="text-sm text-muted">
                {{ $t(`shop.items.${item.id}.english`) }}
              </p>
            </div>
          </div>
          <button
            type="button"
            class="app-chip"
            @click="emit('close')"
          >
            {{ $t('shop.close') }}
          </button>
        </div>
        <p class="mt-4 text-sm font-medium text-primary">
          {{ formatTwd(item.dailyCost) }} / {{ $t('shop.dose') }}
        </p>
        <p class="mt-3 text-sm text-highlighted">
          {{ $t(`shop.items.${item.id}.blurb`) }}
        </p>
        <p class="mt-2 text-sm text-muted">
          {{ $t(`shop.items.${item.id}.need`) }}
        </p>
        <div class="mt-4 rounded-xl bg-muted p-4 text-sm text-highlighted">
          <p class="font-medium">
            {{ $t('shop.usage') }}
          </p>
          <p class="mt-1 text-muted">
            {{ $t(`shop.items.${item.id}.usage`) }}
          </p>
          <p class="mt-2 text-muted">
            {{ $t('shop.shipping') }}
          </p>
        </div>
      </article>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { formatTwd, type SupplementItem } from '~/utils/first-order'

defineProps<{
  item: SupplementItem | null
}>()

const emit = defineEmits<{
  close: []
}>()
</script>
