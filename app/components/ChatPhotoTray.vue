<script setup lang="ts">
import { REPORT_IMAGE_MAX_COUNT } from '~/utils/compress-report-images'

export type PhotoTrayItem = {
  id: string
  previewUrl: string
  name: string
}

defineProps<{
  items: PhotoTrayItem[]
  busy: boolean
  error: string
}>()

const emit = defineEmits<{
  camera: []
  gallery: []
  remove: [id: string]
  confirm: []
  cancel: []
}>()
</script>

<template>
  <div
    class="mx-auto mb-2 w-full max-w-3xl rounded-xl border border-default bg-elevated p-3"
    data-testid="chat-photo-tray"
  >
    <div class="mb-2 flex items-center justify-between gap-2">
      <p class="text-sm font-medium text-highlighted">
        {{ $t('chat.photoTrayTitle') }}
        <span class="font-normal text-muted">
          {{ $t('chat.photoTrayCount', { n: items.length, max: REPORT_IMAGE_MAX_COUNT }) }}
        </span>
      </p>
      <button
        type="button"
        class="text-sm text-muted underline-offset-2 hover:underline"
        data-testid="chat-photo-tray-cancel"
        :disabled="busy"
        @click="emit('cancel')"
      >
        {{ $t('chat.photoTrayCancel') }}
      </button>
    </div>

    <ul
      v-if="items.length"
      class="mb-3 flex gap-2 overflow-x-auto pb-1"
      data-testid="chat-photo-tray-list"
    >
      <li
        v-for="item in items"
        :key="item.id"
        class="relative size-16 shrink-0 overflow-hidden rounded-lg border border-default"
      >
        <img
          :src="item.previewUrl"
          :alt="item.name"
          class="size-full object-cover"
        >
        <button
          type="button"
          class="absolute end-0.5 top-0.5 flex size-5 items-center justify-center rounded-full bg-black/60 text-white"
          :aria-label="$t('chat.photoTrayRemove')"
          :data-testid="`chat-photo-tray-remove-${item.id}`"
          :disabled="busy"
          @click="emit('remove', item.id)"
        >
          <UIcon
            name="lucide:x"
            class="size-3 shrink-0"
          />
        </button>
      </li>
    </ul>
    <p
      v-else
      class="mb-3 text-sm text-muted"
    >
      {{ $t('chat.photoTrayEmpty') }}
    </p>

    <p
      v-if="error"
      class="mb-2 text-sm text-error"
      data-testid="chat-photo-tray-error"
    >
      {{ error }}
    </p>

    <div class="flex flex-wrap items-center gap-2">
      <AppButton
        type="button"
        variant="outline"
        data-testid="chat-photo-tray-camera"
        :disabled="busy || items.length >= REPORT_IMAGE_MAX_COUNT"
        @click="emit('camera')"
      >
        {{ $t('chat.photoTrayCamera') }}
      </AppButton>
      <AppButton
        type="button"
        variant="outline"
        data-testid="chat-photo-tray-gallery"
        :disabled="busy || items.length >= REPORT_IMAGE_MAX_COUNT"
        @click="emit('gallery')"
      >
        {{ $t('chat.photoTrayGallery') }}
      </AppButton>
      <AppButton
        type="button"
        class="ms-auto"
        data-testid="chat-photo-tray-confirm"
        :disabled="busy || items.length === 0"
        @click="emit('confirm')"
      >
        {{ busy ? $t('chat.photoTrayUploading') : $t('chat.photoTrayConfirm') }}
      </AppButton>
    </div>
  </div>
</template>
