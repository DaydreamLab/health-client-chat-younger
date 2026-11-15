<script setup lang="ts">
const props = defineProps<{
  src: string
  alt: string
  /** Which half of the banner holds copy (photo sits on the other side). */
  textSide: 'left' | 'right'
  titleKey: string
  audienceKey: string
  detailKey: string
}>()

const { locale, t } = useI18n()

const useHtmlCopy = computed(() => locale.value === 'en' || locale.value.startsWith('en-'))

const photoObjectClass = computed(() => {
  if (props.textSide === 'right') {
    return 'object-left'
  }
  return 'object-right'
})
</script>

<template>
  <div
    class="relative aspect-[3840/1300] w-full overflow-hidden bg-white"
    data-testid="home-promo-slide"
  >
    <template v-if="!useHtmlCopy">
      <img
        :src="src"
        :alt="alt"
        width="3840"
        height="1300"
        class="aspect-[3840/1300] w-full object-cover"
      >
    </template>
    <template v-else>
      <img
        :src="src"
        alt=""
        width="3840"
        height="1300"
        class="absolute inset-0 size-full object-cover"
        :class="photoObjectClass"
        aria-hidden="true"
      >
      <div
        class="absolute inset-y-0 z-10 flex w-[54%] flex-col justify-center gap-3 bg-white px-5 sm:gap-4 sm:px-10 lg:px-14"
        :class="textSide === 'right' ? 'right-0' : 'left-0'"
      >
        <h3 class="text-lg font-bold tracking-tight text-[#0a4f8c] sm:text-2xl lg:text-3xl">
          {{ t(titleKey) }}
        </h3>
        <p
          class="inline-flex w-fit max-w-full rounded-sm bg-gradient-to-r from-[#0a7ea4] to-[#2bb3c9] px-3 py-1 text-[0.65rem] font-medium text-white sm:text-sm"
        >
          {{ t(audienceKey) }}
        </p>
        <p class="max-w-xl text-[0.65rem] leading-5 text-[#0a4f8c] sm:text-sm sm:leading-6">
          {{ t(detailKey) }}
        </p>
      </div>
      <span class="sr-only">{{ alt }}</span>
    </template>
  </div>
</template>
