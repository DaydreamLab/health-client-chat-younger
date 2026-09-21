<template>
  <Teleport to="body">
    <div
      v-if="item"
      class="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center"
      data-testid="supplement-detail"
      @click.self="emit('close')"
    >
      <article
        class="max-h-[90dvh] w-full max-w-lg overflow-y-auto rounded-2xl border border-default bg-elevated p-5 shadow-xl"
        role="dialog"
        aria-modal="true"
        :aria-labelledby="titleId"
      >
        <div class="flex items-start justify-between gap-3">
          <div class="flex items-center gap-3">
            <span class="flex size-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <UIcon
                name="i-lucide-pill"
                class="size-6"
              />
            </span>
            <div>
              <h2
                :id="titleId"
                class="text-lg font-semibold text-highlighted"
              >
                {{ $t(`shop.items.${item.id}.name`) }}
              </h2>
              <p
                class="mt-1 text-sm text-muted"
                :data-testid="`shop-detail-dose-${item.id}`"
              >
                {{ $t('shop.doseLocked', { count: item.dailyDose }) }}
              </p>
            </div>
          </div>
          <AppButton
            variant="outline"
            @click="emit('close')"
          >
            {{ $t('shop.close') }}
          </AppButton>
        </div>
        <p class="mt-4 text-sm text-highlighted">
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
import type { SupplementItem } from '~/utils/first-order'

const props = defineProps<{
  item: SupplementItem | null
}>()

const emit = defineEmits<{
  close: []
}>()

const titleId = 'supplement-detail-title'

function onKey(event: KeyboardEvent) {
  if (event.key === 'Escape' && props.item) {
    emit('close')
  }
}

onMounted(() => {
  window.addEventListener('keydown', onKey)
})

onUnmounted(() => {
  window.removeEventListener('keydown', onKey)
})
</script>
