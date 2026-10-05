<template>
  <NuxtLink
    :to="localePath('/')"
    active-class=""
    exact-active-class=""
    class="rounded-md font-semibold tracking-tight text-highlighted focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
    :class="compact ? 'flex size-16 items-center justify-center' : 'inline-flex items-center px-1 text-xl'"
    :aria-label="$t('brand')"
  >
    <img
      v-if="compact"
      :src="markSrc"
      alt=""
      data-testid="brand"
      class="size-16 object-contain"
    >
    <template v-else>
      <img
        :src="wordmarkSrc"
        alt=""
        data-testid="brand"
        class="h-10 w-auto dark:hidden"
      >
      <img
        :src="wordmarkDarkSrc"
        alt=""
        data-testid="brand-dark"
        class="hidden h-10 w-auto dark:block"
      >
    </template>
  </NuxtLink>
</template>

<script setup lang="ts">
withDefaults(defineProps<{
  compact?: boolean
}>(), {
  compact: false
})

const localePath = useLocalePath()
const config = useRuntimeConfig()
const markSrc = `${config.app.baseURL}brand-mark.png`
const wordmarkSrc = `${config.app.baseURL}brand-wordmark.png`
const wordmarkDarkSrc = `${config.app.baseURL}brand-wordmark-dark.png`
</script>
