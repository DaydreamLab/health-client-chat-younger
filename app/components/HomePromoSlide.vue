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
  <!-- zh-TW: keep original full-bleed banner aspect. -->
  <div
    v-if="!useHtmlCopy"
    class="relative aspect-[3840/1300] w-full overflow-hidden bg-white"
    data-testid="home-promo-slide"
  >
    <img
      :src="src"
      :alt="alt"
      width="3840"
      height="1300"
      class="aspect-[3840/1300] w-full object-cover"
    >
  </div>
  <!--
    EN: below ~sm stack photo above copy so title/audience/detail stay fully
    visible at 360–430px; sm+ keeps side panel over the photo half.
  -->
  <div
    v-else
    class="home-promo-en relative w-full overflow-hidden bg-white max-sm:flex max-sm:flex-col sm:aspect-[3840/1300]"
    data-testid="home-promo-slide"
  >
    <img
      :src="src"
      alt=""
      width="3840"
      height="1300"
      class="home-promo-en-photo pointer-events-none select-none max-sm:aspect-[16/10] max-sm:w-full max-sm:object-cover sm:absolute sm:inset-0 sm:size-full sm:object-cover"
      :class="photoObjectClass"
      aria-hidden="true"
    >
    <div
      class="home-promo-en-copy z-10 flex flex-col justify-center gap-2 bg-white px-4 py-4 max-sm:relative max-sm:w-full sm:absolute sm:inset-y-0 sm:w-[54%] sm:gap-3 sm:px-5 sm:py-0 md:gap-4 md:px-10 lg:px-14"
      :class="textSide === 'right' ? 'sm:right-0' : 'sm:left-0'"
      data-testid="home-promo-copy"
    >
      <h3
        class="text-base font-bold tracking-tight text-[#0a4f8c] sm:text-lg md:text-2xl lg:text-3xl"
        data-testid="home-promo-title"
      >
        {{ t(titleKey) }}
      </h3>
      <p
        class="inline-flex w-fit max-w-full rounded-sm bg-gradient-to-r from-[#0a7ea4] to-[#2bb3c9] px-2.5 py-1 text-[0.7rem] font-medium leading-snug text-white sm:px-3 sm:text-sm"
        data-testid="home-promo-audience"
      >
        {{ t(audienceKey) }}
      </p>
      <p
        class="max-w-xl text-[0.7rem] leading-5 text-[#0a4f8c] sm:text-xs sm:leading-5 md:text-sm md:leading-6"
        data-testid="home-promo-detail"
      >
        {{ t(detailKey) }}
      </p>
    </div>
    <span class="sr-only">{{ alt }}</span>
  </div>
</template>
